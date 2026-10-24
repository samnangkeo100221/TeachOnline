/**
 * TeachOnline - Student Exam & Learning Engine
 * Handles interactive tests, video watching, multimedia lesson viewing, and grading
 */

const ExamEngine = {
  currentStudent: null,
  selectedLesson: null,
  selectedLevel: null,
  currentLessonData: null,
  questions: [],
  examDuration: 3600,
  timerInterval: null,
  examSubmitted: false,
  selectedMatchLeft: null,
  matchingLines: {},
  matchingAnswers: {},
  matchingOriginalMaps: {},

  init: async function() {
    this.attachSoundEffects();
    await this.populateStudentDropdown();
    await this.populateLessonDropdown();
    this.setupListeners();
  },

  setupListeners: function() {
    const lessonSelect = document.getElementById("lessonSelect");
    const levelSelect = document.getElementById("levelSelect");

    if (lessonSelect) {
      lessonSelect.addEventListener("change", async () => {
        const lessonName = lessonSelect.value;
        levelSelect.innerHTML = '<option value="">-- ជ្រើសរើស Level --</option>';
        this.hideMediaContainer();

        if (!lessonName) return;
        const allLessons = await window.TeachData.getLessons();
        const matchingLevels = allLessons.filter(l => l.lesson_name === lessonName);
        matchingLevels.forEach(l => {
          const opt = document.createElement("option");
          opt.value = l.level;
          opt.textContent = l.level;
          levelSelect.appendChild(opt);
        });

        if (matchingLevels.length === 1) {
          levelSelect.value = matchingLevels[0].level;
          this.onLessonLevelChanged();
        }
      });
    }

    if (levelSelect) {
      levelSelect.addEventListener("change", () => {
        this.onLessonLevelChanged();
      });
    }

    window.addEventListener("resize", () => this.repositionMatchingLines());
    window.addEventListener("scroll", () => this.repositionMatchingLines(), true);
  },

  async populateStudentDropdown() {
    const studentSelect = document.getElementById("studentSelect");
    if (!studentSelect) return;
    studentSelect.innerHTML = '<option value="">-- ជ្រើសរើសឈ្មោះសិស្ស --</option>';
    const students = await window.TeachData.getStudents();
    students.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.name;
      opt.textContent = s.name;
      studentSelect.appendChild(opt);
    });
  },

  async populateLessonDropdown() {
    const lessonSelect = document.getElementById("lessonSelect");
    if (!lessonSelect) return;
    lessonSelect.innerHTML = '<option value="">-- ជ្រើសរើសមេរៀន --</option>';
    const lessons = await window.TeachData.getLessons();
    const uniqueNames = [...new Set(lessons.map(l => l.lesson_name))];
    uniqueNames.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      lessonSelect.appendChild(opt);
    });
  },

  async onLessonLevelChanged() {
    const lessonName = document.getElementById("lessonSelect").value;
    const level = document.getElementById("levelSelect").value;

    if (!lessonName || !level) {
      this.hideMediaContainer();
      return;
    }

    const allLessons = await window.TeachData.getLessons();
    const lesson = allLessons.find(l => l.lesson_name === lessonName && l.level === level);
    if (!lesson) {
      this.hideMediaContainer();
      return;
    }

    this.currentLessonData = lesson;
    this.displayLessonAndVideos(lesson);
  },

  displayLessonAndVideos(lesson) {
    const mediaContainer = document.getElementById("mediaContainer");
    const videoWrapper1 = document.getElementById("videoWrapper1");
    const videoWrapper2 = document.getElementById("videoWrapper2");
    const videoContent1 = document.getElementById("videoContent1");
    const videoContent2 = document.getElementById("videoContent2");
    const lessonDataContainer = document.getElementById("lessonDataContainer");

    if (!mediaContainer) return;

    let hasMedia = false;

    // Render Video 1
    if (lesson.video_link1 && lesson.video_link1.trim() !== "") {
      videoContent1.innerHTML = window.MediaEmbed.renderVideo(lesson.video_link1);
      videoWrapper1.style.display = "block";
      hasMedia = true;
    } else {
      videoWrapper1.style.display = "none";
      videoContent1.innerHTML = "";
    }

    // Render Video 2
    if (lesson.video_link2 && lesson.video_link2.trim() !== "") {
      videoContent2.innerHTML = window.MediaEmbed.renderVideo(lesson.video_link2);
      videoWrapper2.style.display = "block";
      hasMedia = true;
    } else {
      videoWrapper2.style.display = "none";
      videoContent2.innerHTML = "";
    }

    // Render Rich Lesson Details
    const setupSection = (containerId, textId, rawText) => {
      const container = document.getElementById(containerId);
      const textEl = document.getElementById(textId);
      if (!container || !textEl) return;
      if (rawText && rawText.trim() !== "") {
        let formatted = rawText.replace(/\n/g, '<br>\n');
        textEl.innerHTML = window.marked ? window.marked.parse(formatted) : formatted;
        container.style.display = "block";
        hasMedia = true;
      } else {
        container.style.display = "none";
      }
    };

    document.getElementById("lsnTitle").innerText = lesson.title || (lesson.lesson_name + " - " + lesson.level);
    setupSection("lsnObjContainer", "lsnObj", lesson.objectives);
    setupSection("lsnContentContainer", "lsnContent", lesson.content);
    setupSection("lsnFormulaContainer", "lsnFormula", lesson.formula_summary);
    setupSection("lsnExamplesContainer", "lsnExamples", lesson.examples);
    setupSection("lsnNotesContainer", "lsnNotes", lesson.notes);
    setupSection("lsnErrorsContainer", "lsnErrors", lesson.common_errors);

    lessonDataContainer.style.display = "block";
    mediaContainer.style.display = hasMedia ? "block" : "none";

    // Trigger MathJax typeset if present
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([mediaContainer]).catch(err => console.log('MathJax error:', err));
    }
  },

  hideMediaContainer() {
    const mediaContainer = document.getElementById("mediaContainer");
    if (mediaContainer) mediaContainer.style.display = "none";
  },

  // ==========================================
  // STUDENT LOGIN & START EXAM
  // ==========================================
  async loginAndStartExam() {
    this.examSubmitted = false;
    this.clearMatchingState();

    const studentSelect = document.getElementById("studentSelect");
    const passwordInput = document.getElementById("passwordInput");
    const lessonSelect = document.getElementById("lessonSelect");
    const levelSelect = document.getElementById("levelSelect");
    const msgDiv = document.getElementById("loginMessage");

    const name = studentSelect.value.trim();
    const pass = passwordInput.value.trim();
    const lesson = lessonSelect.value.trim();
    const level = levelSelect.value.trim();

    if (!name || !pass || !lesson || !level) {
      this.showLoginMessage("សូមបំពេញព័ត៌មាន (ឈ្មោះ លេខសម្ងាត់ មេរៀន និង Level) ឱ្យបានគ្រប់គ្រាន់!", true);
      return;
    }

    this.showLoginMessage("កំពុងផ្ទៀងផ្ទាត់...", false);
    const auth = await window.TeachData.authenticateStudent(name, pass);
    if (!auth.success) {
      this.showLoginMessage(auth.message || "ឈ្មោះសិស្ស ឬលេខសម្ងាត់មិនត្រឹមត្រូវ!", true);
      return;
    }

    this.currentStudent = auth.student;
    this.selectedLesson = lesson;
    this.selectedLevel = level;

    // Load Exam duration
    const allLessons = await window.TeachData.getLessons();
    const lObj = allLessons.find(l => l.lesson_name === lesson && l.level === level);
    const durationMin = (lObj && lObj.duration_minutes > 0) ? lObj.duration_minutes : 60;
    this.examDuration = durationMin * 60;

    await this.loadQuestionsAndStart();
  },

  async loadQuestionsAndStart() {
    this.showLoginMessage("កំពុងទាញយកសំណួរ...", false);
    const list = await window.TeachData.getQuestions(this.selectedLesson, this.selectedLevel);

    if (!list || list.length === 0) {
      this.showLoginMessage("មិនទាន់មានសំណួរសម្រាប់មេរៀននេះនៅឡើយទេ! សូមទាក់ទងលោកគ្រូ។", true);
      return;
    }

    this.questions = list.map((q, idx) => this.normalizeQuestionData(q, idx));

    document.getElementById("loginSection").classList.add("hidden");
    document.getElementById("examSection").classList.remove("hidden");
    document.getElementById("examTitle").textContent = `${this.selectedLesson} (${this.selectedLevel}) - សិស្ស៖ ${this.currentStudent.name}`;

    this.renderQuestions();
    this.startTimer();
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  normalizeQuestionData(q, index) {
    const rawId = q.id || ("q_" + index);
    return {
      id: String(rawId),
      type: String(q.type || "").trim().toUpperCase().replace(/-/g, "_"),
      sectionTitle: q.category || q.sectionTitle || "",
      points: Number(q.points) || 1,
      title: q.questionTitle || "",
      text: q.questionText || "",
      mediaURL: q.mediaURL || "",
      speechText: q.speechText || "",
      options: q.options || "",
      correctAnswer: q.correctAnswer || "",
      dataExtra: q.dataExtra || "",
      language: q.language || "en-US",
      audioLanguage: q.audioLanguage || "en-US"
    };
  },

  // ==========================================
  // RENDER QUESTIONS
  // ==========================================
  renderQuestions() {
    const container = document.getElementById("questionsContainer");
    container.innerHTML = "";

    const sections = {
      MCQ: { className: "section-mcq-text", icon: "📝", title: "Multiple Choice", description: "ជ្រើសរើសចម្លើយដែលត្រឹមត្រូវមួយ" },
      MCQ_TEXT: { className: "section-mcq-text", icon: "📝", title: "Multiple Choice (Text)", description: "ជ្រើសរើសចម្លើយដែលត្រឹមត្រូវមួយ" },
      MCQ_IMAGE: { className: "section-mcq-image", icon: "🖼️", title: "Multiple Choice (Image)", description: "សង្កេតមើលរូបភាព ហើយជ្រើសរើសចម្លើយត្រឹមត្រូវ" },
      MCQ_AUDIO: { className: "section-mcq-audio", icon: "🎧", title: "Multiple Choice (Audio)", description: "ស្តាប់ការបញ្ចេញសំឡេង ហើយជ្រើសរើសចម្លើយត្រឹមត្រូវ" },
      TRUE_FALSE: { className: "section-truefalse", icon: "⚖️", title: "True / False", description: "ជ្រើសរើស TRUE (ត្រូវ) ឬ FALSE (ខុស)" },
      FILL: { className: "section-fill", icon: "✏️", title: "Fill in the Blanks", description: "បំពេញពាក្យ ឬឃ្លាក្នុងចន្លោះប្រហោង" },
      SHORT_ANSWER: { className: "section-short", icon: "✍️", title: "Short Answer", description: "សរសេរចម្លើយខ្លីៗដោយខ្លួនឯង" },
      MATCHING: { className: "section-matching", icon: "🔗", title: "Matching", description: "ផ្គូផ្គងជម្រើសខាងឆ្វេង ទៅនឹងជម្រើសខាងស្តាំ" },
      DRAG_DROP: { className: "section-dragdrop", icon: "🖱️", title: "Drag and Drop (Ordering)", description: "ចុចលើពាក្យដើម្បីរៀបលំដាប់ប្រយោគឱ្យបានត្រឹមត្រូវ" },
      DRAG_ANSWER: { className: "section-draganswer", icon: "🎯", title: "Drag and Drop (Selection)", description: "ចុចជ្រើសរើសពាក្យដែលត្រូវដាក់ចូលប្រអប់" },
      LISTEN_WRITE: { className: "section-listen-write", icon: "🎧", title: "Listening - Write", description: "ស្តាប់ការបញ្ចេញសំឡេង ហើយសរសេរពាក្យដែលបានឮ" },
      READING: { className: "section-reading", icon: "📖", title: "Reading Comprehension", description: "អានអត្ថបទខាងក្រោម រួចឆ្លើយសំណួរ" }
    };

    const grouped = {};
    this.questions.forEach(q => {
      let type = q.type;
      if (type === "MCQ") type = "MCQ_TEXT";
      else if (type.includes("LISTEN")) type = "LISTEN_WRITE";
      else if (type.includes("DRAG")) type = "DRAG_DROP";

      const groupKey = q.sectionTitle ? (q.sectionTitle + "___" + type) : type;
      if (!grouped[groupKey]) {
        grouped[groupKey] = { categoryTitle: q.sectionTitle || "", type: type, list: [] };
      }
      grouped[groupKey].list.push(q);
    });

    Object.keys(grouped).forEach(key => {
      const group = grouped[key];
      const list = group.list;
      if (list.length === 0) return;

      const defaultConfig = sections[group.type] || { className: "", icon: "❓", title: group.type, description: "" };
      const displayTitle = group.categoryTitle || defaultConfig.title;

      const sectionEl = document.createElement("div");
      sectionEl.className = "question-section " + defaultConfig.className;
      sectionEl.innerHTML = `
        <div class="question-section-header">
          <span class="section-icon">${defaultConfig.icon}</span>
          <h3>${this.escapeHtml(displayTitle)}</h3>
        </div>
        <div class="section-description">${defaultConfig.description}</div>
        <div class="question-section-body"></div>
      `;

      const body = sectionEl.querySelector(".question-section-body");

      list.forEach((q, localIndex) => {
        const card = document.createElement("div");
        card.className = "question-card";
        card.dataset.id = String(q.id);

        let langToRead = this.detectLanguageCode(q.language, q.title);
        let audioLang = this.detectLanguageCode(q.audioLanguage || q.language, q.speechText || q.title);

        let html = '';
        let combinedText = [q.title, q.text].filter(Boolean).join(". ");
        let safeCombined = this.escapeAttribute(JSON.stringify(combinedText));

        if (combinedText !== "") {
          html += `<button type="button" class="tts-btn" onclick="ExamEngine.speakText(${safeCombined}, '${langToRead}')"><i class="fa-solid fa-volume-high"></i> ស្តាប់សំណួរ (Read)</button>`;
        }

        if (q.title) {
          html += `<div class="question-title-text">${this.escapeHtml(q.title)}</div>`;
        }

        if (group.type !== "FILL") {
          html += `<div class="question-text"><span class="question-number">${localIndex + 1}</span>`;
          if (q.text) html += ` <span>${this.escapeHtml(q.text).replace(/\n/g, '<br>')}</span>`;
          html += `</div>`;
        }

        if (q.mediaURL) {
          if (q.mediaURL.match(/\.(mp3|wav|ogg)$/i)) {
            html += `<audio controls style="margin: 10px 0; width: 100%;"><source src="${this.escapeAttribute(q.mediaURL)}"></audio>`;
          } else {
            html += `<img class="question-image" src="${this.escapeAttribute(q.mediaURL)}" onerror="this.style.display='none'">`;
          }
        }

        // Render question by type
        if (group.type.startsWith("LISTEN")) {
          let audioBtn = "";
          if (q.speechText) {
            audioBtn = `<button type="button" class="primary-btn" style="min-height:50px !important; font-size:20px !important; margin: 10px 0;" onclick='ExamEngine.speakText(${JSON.stringify(q.speechText)}, "${audioLang}")'><i class="fa-solid fa-headphones"></i> ចុចស្តាប់សំឡេង</button>`;
          }
          html += `
            <div class="listen-container" style="background:#f1f5f9; padding:15px; border-radius:12px;">
              <p style="margin:0 0 8px 0; font-weight:700; color:var(--primary);">🎧 សូមស្តាប់សំឡេង រួចសរសេរចម្លើយ៖</p>
              ${audioBtn}
              <input type="text" id="answer_${q.id}" class="fill-input" placeholder="សរសេរចម្លើយនៅទីនេះ..." style="width:100% !important; margin-top:10px;">
            </div>
          `;
        } else if (group.type === "MCQ_TEXT" || group.type === "MCQ_IMAGE" || group.type === "MCQ_AUDIO" || group.type === "READING") {
          if (group.type === "MCQ_AUDIO" && (q.speechText || q.title || q.text)) {
            html += `<div class="listen-container" style="background:#f1f5f9; padding:12px; border-radius:10px; margin-bottom:12px;">
              <button type="button" class="primary-btn" style="min-height:50px !important; font-size:20px !important;" onclick='ExamEngine.speakText(${JSON.stringify(q.speechText || q.title || q.text)}, "${audioLang}")'><i class="fa-solid fa-volume-high"></i> ចុចស្តាប់</button>
            </div>`;
          }
          let options = this.parseOptions(q.options);
          this.shuffleArray(options);
          let langStr = this.escapeAttribute(JSON.stringify(q.language || ""));
          options.forEach(opt => {
            let optStr = this.escapeAttribute(JSON.stringify(opt));
            html += `<label class="option" onclick="ExamEngine.speakText(${optStr}, ExamEngine.detectLanguageCode(${langStr}, ${optStr}))">
              <input type="radio" name="q_${q.id}" value="${this.escapeAttribute(opt)}">
              <span>${this.escapeHtml(opt)}</span>
            </label>`;
          });
        } else if (group.type === "TRUE_FALSE") {
          let tfOptions = ["TRUE", "FALSE"];
          tfOptions.forEach(opt => {
            html += `<label class="option">
              <input type="radio" name="q_${q.id}" value="${opt}">
              <span>${opt}</span>
            </label>`;
          });
        } else if (group.type === "FILL") {
          html += this.renderFillQuestion(q, localIndex);
        } else if (group.type === "SHORT_ANSWER") {
          html += `<textarea id="answer_${q.id}" placeholder="សរសេរចម្លើយរបស់អ្នកនៅទីនេះ..." style="width:100%; min-height:90px;"></textarea>`;
        } else if (group.type === "MATCHING") {
          html += this.renderMatching(q);
        } else if (group.type === "DRAG_DROP") {
          html += this.renderDragDropOrder(q);
        }

        card.innerHTML = html;
        body.appendChild(card);
      });

      container.appendChild(sectionEl);
    });

    this.attachSoundEffects();
  },

  renderFillQuestion(q, localIndex = 0) {
    let rawText = q.text || q.title || "";
    let questionDisplay = this.escapeHtml(rawText);
    const correctParts = String(q.correctAnswer || "").split("|").map(a => a.trim());
    let inputIndex = 0;

    questionDisplay = questionDisplay.replace(/\{\{\s*input(\d*)\s*\}\}/gi, (match, number) => {
      inputIndex++;
      const inputNum = number !== "" ? Number(number) : inputIndex;
      const targetAns = correctParts[inputIndex - 1] || "";
      const charLength = Math.max(targetAns.length, 6);
      return `<input class="fill-input" type="text" id="answer_${q.id}_${inputNum}" data-question-id="${q.id}" data-input-number="${inputNum}" size="${charLength}" placeholder="..." autocomplete="off">`;
    });

    if (inputIndex === 0) {
      questionDisplay += ` <input class="fill-input" type="text" id="answer_${q.id}_1" data-question-id="${q.id}" data-input-number="1" size="10" placeholder="..." autocomplete="off">`;
    }

    return `
      <div class="fill-question">
        <div class="question-text">
          <span class="question-number">${localIndex + 1}</span> ${questionDisplay}
        </div>
      </div>
    `;
  },

  renderMatching(q) {
    let data;
    try {
      data = typeof q.dataExtra === "string" ? JSON.parse(q.dataExtra) : q.dataExtra;
    } catch(e) {
      return `<p style="color:red;">Error parsing matching data</p>`;
    }

    if (!data || !Array.isArray(data.left) || !Array.isArray(data.right)) {
      return `<p style="color:red;">Invalid matching format</p>`;
    }

    let originalCorrectMap = {};
    try {
      originalCorrectMap = typeof q.correctAnswer === "string" ? JSON.parse(q.correctAnswer) : (q.correctAnswer || {});
    } catch(e) {}

    let rightIndices = data.right.map((_, i) => i);
    let shuffledRight = rightIndices.map(rIdx => ({ text: data.right[rIdx], originalIndex: rIdx }));
    this.shuffleArray(shuffledRight);

    this.matchingOriginalMaps[q.id] = {
      originalLeft: data.left,
      originalRight: data.right,
      originalCorrectMap: originalCorrectMap,
      shuffledRightMap: shuffledRight
    };

    let html = `
      <div class="matching-container" id="match_container_${q.id}">
        <p style="margin-bottom:12px; color:var(--text-muted); font-size:20px;">💡 ចុចលើជម្រើសខាងឆ្វេង រួចចុចលើជម្រើសខាងស្តាំដើម្បីភ្ជាប់គូ</p>
        <div class="matching-columns">
          <div class="left-column">
    `;

    data.left.forEach((leftText, idx) => {
      let leftStr = this.escapeAttribute(JSON.stringify(leftText));
      html += `
        <div class="match-item" id="q_${q.id}_L_${idx}" onclick="ExamEngine.speakText(${leftStr}); ExamEngine.selectMatchLeft('${q.id}', ${idx});">
          <span class="box-id" style="color:var(--primary); margin-right:8px; font-weight:bold;">${idx + 1}.</span>
          <span>${this.escapeHtml(leftText)}</span>
        </div>
      `;
    });

    html += `</div><div class="right-column">`;

    shuffledRight.forEach((item, idx) => {
      let rightStr = this.escapeAttribute(JSON.stringify(item.text));
      html += `
        <div class="match-item" id="q_${q.id}_R_${idx}" data-original-right="${item.originalIndex}" onclick="ExamEngine.speakText(${rightStr}); ExamEngine.selectMatchRight('${q.id}', ${idx});">
          <span class="box-id" style="color:var(--primary); margin-right:8px; font-weight:bold;">${String.fromCharCode(65 + idx)}.</span>
          <span>${this.escapeHtml(item.text)}</span>
        </div>
      `;
    });

    html += `</div></div></div>`;
    return html;
  },

  selectMatchLeft(qId, leftIndex) {
    const container = document.getElementById(`match_container_${qId}`);
    const leftEl = document.getElementById(`q_${qId}_L_${leftIndex}`);
    if (!container || !leftEl) return;

    container.querySelectorAll(".left-column .match-item").forEach(el => el.classList.remove("selected"));
    this.selectedMatchLeft = { qId: String(qId), index: leftIndex, element: leftEl };
    leftEl.classList.add("selected");
  },

  selectMatchRight(qId, rightIndex) {
    if (!this.selectedMatchLeft || String(this.selectedMatchLeft.qId) !== String(qId)) {
      alert("សូមចុចលើជម្រើសខាងឆ្វេងជាមុនសិន!");
      return;
    }

    const leftEl = this.selectedMatchLeft.element;
    const rightEl = document.getElementById(`q_${qId}_R_${rightIndex}`);
    if (!rightEl) return;

    if (!this.matchingLines[qId]) this.matchingLines[qId] = [];
    if (!this.matchingAnswers[qId]) this.matchingAnswers[qId] = {};

    // Remove existing lines connected to this left or right
    this.matchingLines[qId] = this.matchingLines[qId].filter(item => {
      if (item.leftEl === leftEl || item.rightEl === rightEl) {
        if (item.line) {
          try { item.line.remove(); } catch(e) {}
        }
        delete this.matchingAnswers[qId][item.leftIndex];
        item.leftEl.classList.remove("paired");
        item.rightEl.classList.remove("paired");
        item.leftEl.style.removeProperty('border-color');
        item.leftEl.style.removeProperty('background-color');
        item.rightEl.style.removeProperty('border-color');
        item.rightEl.style.removeProperty('background-color');
        return false;
      }
      return true;
    });

    const colorPalette = [
      { line: "#3b82f6", bg: "#eff6ff" },
      { line: "#ef4444", bg: "#fef2f2" },
      { line: "#10b981", bg: "#ecfdf5" },
      { line: "#f59e0b", bg: "#fffbeb" },
      { line: "#8b5cf6", bg: "#f5f3ff" },
      { line: "#ec4899", bg: "#fdf2f8" }
    ];
    const theme = colorPalette[this.selectedMatchLeft.index % colorPalette.length];

    let line = null;
    if (window.LeaderLine) {
      try {
        line = new window.LeaderLine(leftEl, rightEl, {
          color: theme.line,
          size: 3,
          path: 'fluid',
          startSocket: 'right',
          endSocket: 'left',
          startPlug: 'behind',
          endPlug: 'arrow1',
          dropShadow: true
        });
      } catch(err) {
        console.warn("LeaderLine failed:", err);
      }
    }

    this.matchingLines[qId].push({
      line: line,
      leftEl: leftEl,
      rightEl: rightEl,
      leftIndex: this.selectedMatchLeft.index,
      rightIndex: rightIndex
    });

    this.matchingAnswers[qId][this.selectedMatchLeft.index] = Number(rightEl.getAttribute("data-original-right"));

    leftEl.classList.remove("selected");
    leftEl.classList.add("paired");
    rightEl.classList.add("paired");
    leftEl.style.setProperty('border-color', theme.line, 'important');
    leftEl.style.setProperty('background-color', theme.bg, 'important');
    rightEl.style.setProperty('border-color', theme.line, 'important');
    rightEl.style.setProperty('background-color', theme.bg, 'important');

    this.selectedMatchLeft = null;
    this.playSound('click');
  },

  repositionMatchingLines() {
    Object.keys(this.matchingLines || {}).forEach(qId => {
      this.matchingLines[qId].forEach(item => {
        if (item.line && typeof item.line.position === "function") {
          try { item.line.position(); } catch(e) {}
        }
      });
    });
  },

  clearMatchingState() {
    Object.keys(this.matchingLines || {}).forEach(qId => {
      this.matchingLines[qId].forEach(item => {
        if (item.line) {
          try { item.line.remove(); } catch(e) {}
        }
      });
    });
    this.matchingLines = {};
    this.matchingAnswers = {};
    this.matchingOriginalMaps = {};
    this.selectedMatchLeft = null;
  },

  renderDragDropOrder(q) {
    let words = this.parseDragWords(q);
    this.shuffleArray(words);
    let langStr = this.escapeAttribute(JSON.stringify(q.language || ""));

    let html = `
      <div class="dragdrop-container" id="dragdrop_${q.id}">
        <p style="margin:0 0 10px 0; font-weight:700; color:var(--primary-hover);">
          <i class="fa-solid fa-hand-pointer"></i> ចុចលើពាក្យដើម្បីដាក់ចូល ឬដកចេញ៖
        </p>
        <div class="drop-zone" id="dropzone_${q.id}"></div>
        <div class="word-bank" id="wordbank_${q.id}" style="margin-top:12px;">
    `;

    words.forEach((word, idx) => {
      let wordStr = this.escapeAttribute(JSON.stringify(word));
      html += `
        <div class="draggable-word" id="word_${q.id}_${idx}" onclick="ExamEngine.speakText(${wordStr}, ExamEngine.detectLanguageCode(${langStr}, ${wordStr})); ExamEngine.toggleWordClick(this, '${q.id}');">
          ${this.escapeHtml(word)}
        </div>
      `;
    });

    html += `</div></div>`;
    return html;
  },

  toggleWordClick(el, qId) {
    const dropzone = document.getElementById(`dropzone_${qId}`);
    const wordbank = document.getElementById(`wordbank_${qId}`);
    if (!dropzone || !wordbank) return;

    if (el.parentElement === dropzone) {
      wordbank.appendChild(el);
    } else {
      dropzone.appendChild(el);
    }
    this.playSound('click');
    this.repositionMatchingLines();
  },

  parseDragWords(q) {
    let words = [];
    if (q.dataExtra) {
      try {
        let d = typeof q.dataExtra === "string" ? JSON.parse(q.dataExtra) : q.dataExtra;
        if (d && Array.isArray(d.words)) words = d.words.map(w => String(w));
      } catch(e) {}
    }
    if (words.length === 0 && q.options) {
      words = this.parseOptions(q.options);
    }
    if (words.length === 0 && q.correctAnswer) {
      words = String(q.correctAnswer).split(/\s+/).map(w => w.trim()).filter(Boolean);
    }
    return words;
  },

  parseOptions(val) {
    return String(val || "").split("|").map(o => o.trim()).filter(Boolean);
  },

  // ==========================================
  // TIMER
  // ==========================================
  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.updateTimerDisplay(this.examDuration);

    this.timerInterval = setInterval(() => {
      this.examDuration--;
      this.updateTimerDisplay(this.examDuration);
      if (this.examDuration <= 0) {
        clearInterval(this.timerInterval);
        alert("ដល់កំណត់ពេលវេលាប្រឡងហើយ! ប្រព័ន្ធនឹងបញ្ជូនចម្លើយដោយស្វ័យប្រវត្តិ។");
        this.submitExam();
      }
    }, 1000);
  },

  updateTimerDisplay(seconds) {
    const timerEl = document.getElementById("timer");
    if (!timerEl) return;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timerEl.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  },

  // ==========================================
  // ANSWER EXTRACTION & SUBMISSION
  // ==========================================
  getStudentAnswer(q) {
    const type = q.type;

    if (type.includes("MCQ") || type === "TRUE_FALSE" || type === "READING") {
      const selected = document.querySelectorAll(`input[name="q_${q.id}"]:checked`);
      if (selected.length > 1) {
        let arr = [];
        selected.forEach(el => arr.push(el.value));
        return JSON.stringify(arr);
      }
      return selected.length === 1 ? selected[0].value : "";
    }

    if (type === "FILL") {
      const inputs = document.querySelectorAll(`.question-card[data-id="${q.id}"] input.fill-input`);
      if (inputs.length === 0) return JSON.stringify([]);
      const arr = [];
      inputs.forEach(inp => arr.push(inp.value.trim()));
      return JSON.stringify(arr);
    }

    if (type === "MATCHING") {
      const studentMap = this.matchingAnswers[q.id] || {};
      let data = { left: [], right: [] };
      try {
        data = typeof q.dataExtra === "string" ? JSON.parse(q.dataExtra) : q.dataExtra;
      } catch(e) {}
      const pairs = [];
      Object.keys(studentMap).forEach(leftIdx => {
        const rightIdx = studentMap[leftIdx];
        if (data.left[leftIdx] !== undefined && data.right[rightIdx] !== undefined) {
          pairs.push({ left: data.left[leftIdx], right: data.right[rightIdx] });
        }
      });
      return JSON.stringify(pairs);
    }

    if (type === "DRAG_DROP" || type.includes("DRAG")) {
      const dropzone = document.getElementById(`dropzone_${q.id}`);
      if (!dropzone) return "";
      const words = [];
      dropzone.querySelectorAll(".draggable-word").forEach(w => words.push(w.textContent.trim()));
      return words.join(" ");
    }

    const input = document.getElementById(`answer_${q.id}`);
    return input ? input.value.trim() : "";
  },

  async submitExam() {
    if (this.examSubmitted) return;
    const submitBtn = document.querySelector("#examSection .submit-btn");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `⏳ កំពុងពិនិត្យចម្លើយ... សូមរង់ចាំ!`;
    }

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    let aiPendingList = [];
    let evaluatedQuestions = [];

    this.questions.forEach(q => {
      const type = q.type;
      const points = Number(q.points) || 1;
      const studentRaw = this.getStudentAnswer(q);
      const cleanStudent = this.normalizeAnswer(studentRaw);

      let qObj = {
        q: q,
        type: type,
        points: points,
        studentAnswerRaw: studentRaw,
        score: 0,
        isCorrect: false,
        needsAICheck: false,
        aiReason: ""
      };

      if (cleanStudent === "" || cleanStudent === "[]" || cleanStudent === '["","",""]') {
        qObj.score = 0;
        qObj.isCorrect = false;
      } else if (type.includes("MCQ") || type === "TRUE_FALSE" || type === "READING") {
        let correctList = String(q.correctAnswer || "").split("|").map(a => this.normalizeAnswer(a)).filter(Boolean);
        if (correctList.includes(cleanStudent)) {
          qObj.score = points;
          qObj.isCorrect = true;
        } else {
          qObj.score = 0;
          qObj.isCorrect = false;
        }
      } else if (type === "FILL") {
        let userAnswers = [];
        try {
          userAnswers = typeof studentRaw === "string" ? JSON.parse(studentRaw) : studentRaw;
        } catch(e) {
          userAnswers = [studentRaw];
        }
        if (!Array.isArray(userAnswers)) userAnswers = [userAnswers];

        let rawCorrect = String(q.correctAnswer || "").trim();
        let correctParts = rawCorrect.split("|").map(part => part.split("||").map(a => this.normalizeAnswer(a)));
        let matchCount = 0;
        let totalBlanks = Math.max(correctParts.length, userAnswers.length);

        for (let i = 0; i < correctParts.length; i++) {
          let uAns = this.normalizeAnswer(userAnswers[i] || "");
          if (uAns !== "" && correctParts[i] && correctParts[i].includes(uAns)) {
            matchCount++;
          }
        }

        if (totalBlanks > 0 && matchCount > 0) {
          qObj.score = Math.round(((matchCount / totalBlanks) * points) * 100) / 100;
          qObj.isCorrect = (matchCount === totalBlanks);
        } else {
          qObj.score = 0;
          qObj.isCorrect = false;
        }
        if (!qObj.isCorrect) qObj.needsAICheck = true;
      } else if (type === "MATCHING") {
        let studentPairs = [];
        try { studentPairs = JSON.parse(studentRaw); } catch(e) {}
        let correctMap = {};
        try {
          correctMap = typeof q.correctAnswer === "string" ? JSON.parse(q.correctAnswer) : (q.correctAnswer || {});
        } catch(e) {}

        let dataExtra = {};
        try {
          dataExtra = typeof q.dataExtra === "string" ? JSON.parse(q.dataExtra) : (q.dataExtra || {});
        } catch(e) {}

        const leftList = dataExtra.left || [];
        const rightList = dataExtra.right || [];
        const totalPairs = Object.keys(correctMap).length;
        let correctCount = 0;

        if (Array.isArray(studentPairs) && studentPairs.length > 0 && totalPairs > 0) {
          studentPairs.forEach(pair => {
            let sLeft = String(pair.left || "").trim();
            let sRight = String(pair.right || "").trim();
            Object.keys(correctMap).forEach(cKey => {
              let cLeftText = (!isNaN(cKey) && leftList[Number(cKey)] !== undefined) ? String(leftList[Number(cKey)]).trim() : String(cKey).trim();
              let cRightText = (!isNaN(correctMap[cKey]) && rightList[Number(correctMap[cKey])] !== undefined) ? String(rightList[Number(correctMap[cKey])]).trim() : String(correctMap[cKey]).trim();
              if (cLeftText === sLeft && cRightText === sRight) {
                correctCount++;
              }
            });
          });
        }

        if (totalPairs > 0) {
          qObj.score = Math.round((correctCount * (points / totalPairs)) * 100) / 100;
        }
        qObj.isCorrect = (correctCount === totalPairs && totalPairs > 0);
      } else if (type === "DRAG_DROP" || type.includes("DRAG")) {
        const studentWords = String(studentRaw || "").trim().split(/\s+/).map(w => this.normalizeAnswer(w)).filter(Boolean);
        const possibleTargets = String(q.correctAnswer || "").split("|").map(target => 
          target.trim().split(/\s+/).map(w => this.normalizeAnswer(w)).filter(Boolean).join(" ")
        );
        const sCombined = studentWords.join(" ");

        if (possibleTargets.includes(sCombined)) {
          qObj.score = points;
          qObj.isCorrect = true;
        } else {
          qObj.score = 0;
          qObj.isCorrect = false;
          qObj.needsAICheck = true;
        }
      } else {
        // Text / Short answer
        const possibleAnswers = String(q.correctAnswer || "").split("|").map(a => this.normalizeAnswer(a));
        if (possibleAnswers.includes(cleanStudent)) {
          qObj.score = points;
          qObj.isCorrect = true;
        } else {
          qObj.needsAICheck = true;
        }
      }

      if (qObj.needsAICheck && cleanStudent !== "") {
        aiPendingList.push({
          id: q.id,
          question: `${q.title || ''} ${q.text || ''}`,
          studentAnswer: studentRaw,
          correctAnswer: q.correctAnswer
        });
      }

      evaluatedQuestions.push(qObj);
    });

    // Evaluate AI-pending questions if Gemini API key exists
    let aiResultsMap = {};
    const settings = window.TeachData.getSettings();
    if (aiPendingList.length > 0 && settings.geminiApiKey) {
      if (submitBtn) submitBtn.innerHTML = `🤖 Gemini AI កំពុងផ្ទៀងផ្ទាត់ចម្លើយ...`;
      aiResultsMap = await this.evaluateWithGeminiAI(aiPendingList, settings.geminiApiKey);
    }

    let totalScore = 0;
    let totalPossible = 0;
    const reviews = [];

    evaluatedQuestions.forEach(item => {
      const q = item.q;
      const points = item.points;
      totalPossible += points;
      let questionScore = item.score;
      let isCorrect = item.isCorrect;
      let aiEvaluated = false;
      let aiReason = "";

      if (item.needsAICheck && aiResultsMap[q.id]) {
        const aiRes = aiResultsMap[q.id];
        aiEvaluated = true;
        aiReason = aiRes.reason || "បានពិនិត្យដោយ AI";
        const pct = Number(aiRes.scorePercent) || 0;
        questionScore = Math.round((pct / 100) * points * 100) / 100;
        isCorrect = (pct >= 80);
      }

      totalScore += questionScore;
      reviews.push({
        id: q.id,
        type: q.type,
        questionTitle: q.title,
        questionText: q.text,
        points: points,
        score: Math.round(questionScore * 100) / 100,
        correct: isCorrect,
        studentAnswer: item.studentAnswerRaw,
        correctAnswer: q.correctAnswer,
        dataExtra: q.dataExtra,
        aiEvaluated: aiEvaluated,
        aiReason: aiReason
      });
    });

    this.examSubmitted = true;
    totalScore = Math.round(totalScore * 100) / 100;
    const percentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "បញ្ជូនចម្លើយរួចរាល់";
    }

    this.showExamResult(totalScore, totalPossible, percentage);
    this.showAnswersOnQuestions(reviews);
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Save to Supabase and forward to Google Sheet
    await window.TeachData.saveResult({
      studentName: this.currentStudent.name,
      lesson: this.selectedLesson,
      level: this.selectedLevel,
      score: totalScore,
      total: totalPossible,
      percentage: percentage,
      reviews: reviews
    });
  },

  async evaluateWithGeminiAI(list, apiKey) {
    const results = {};
    for (const item of list) {
      try {
        const prompt = `សំណួរ៖ ${item.question}\nចម្លើយគំរូ៖ ${item.correctAnswer}\nចម្លើយសិស្ស៖ ${item.studentAnswer}\n\nសូមពិនិត្យចម្លើយសិស្សធៀបនឹងសំណួរ និងចម្លើយគំរូ ហើយផ្តល់ពិន្ទុជាភាគរយពី 0 ដល់ 100 និងហេតុផលខ្លីជាភាសាខ្មែរ។\nឆ្លើយតបជា JSON តែប៉ុណ្ណោះ ៖\n{"scorePercent": 100, "reason": "ពន្យល់"}`;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { response_mime_type: "application/json" }
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.candidates && data.candidates[0]) {
            let jsonText = data.candidates[0].content.parts[0].text.trim();
            jsonText = jsonText.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
            const parsed = JSON.parse(jsonText);
            results[item.id] = {
              scorePercent: Number(parsed.scorePercent) || 0,
              reason: parsed.reason || "បានពិនិត្យដោយ AI"
            };
          }
        }
      } catch(e) {
        console.warn("Gemini evaluation error for item:", item.id, e);
      }
    }
    return results;
  },

  showExamResult(score, total, percentage) {
    const oldSummary = document.getElementById("examResultSummary");
    if (oldSummary) oldSummary.remove();

    const summary = document.createElement("div");
    summary.id = "examResultSummary";
    summary.className = "result-box";
    summary.innerHTML = `
      <h2>🏆 លទ្ធផលប្រឡង</h2>
      <h3 style="color:var(--text-main); margin-bottom:5px;">${this.escapeHtml(this.currentStudent.name)}</h3>
      <p style="color:var(--text-muted); font-size:22px;">${this.escapeHtml(this.selectedLesson)} | ${this.escapeHtml(this.selectedLevel)}</p>
      <div style="font-size:3.5rem; font-weight:800; color:var(--primary); margin:15px 0;">${score} / ${total}</div>
      <div style="font-size:2rem; font-weight:700; color:${percentage >= 50 ? 'var(--success)' : 'var(--error)'};">${percentage}%</div>
      <p style="margin-top:15px; color:#10b981; font-weight:600;"><i class="fa-solid fa-cloud-arrow-up"></i> បានរក្សាទុកក្នុង Supabase និងបញ្ជូនទៅ Google Sheet រួចរាល់!</p>
    `;

    const examSection = document.getElementById("examSection");
    if (examSection) examSection.prepend(summary);
  },

  showAnswersOnQuestions(reviews) {
    reviews.forEach(r => {
      const cards = document.querySelectorAll(".question-card");
      const card = Array.from(cards).find(c => String(c.dataset.id) === String(r.id));
      if (!card) return;

      const oldResult = card.querySelector(".answer-result");
      if (oldResult) oldResult.remove();

      let studentDisplay = this.formatStudentAnswerDisplay(r);
      let correctDisplay = this.formatCorrectAnswerDisplay(r);

      const resultDiv = document.createElement("div");
      resultDiv.className = "answer-result";
      resultDiv.style.padding = "14px 18px";
      resultDiv.style.marginTop = "14px";
      resultDiv.style.borderRadius = "12px";
      resultDiv.style.fontSize = "22px";

      const roundedScore = Math.round(r.score * 100) / 100;
      if (roundedScore === r.points) {
        resultDiv.style.backgroundColor = "#ecfdf5";
        resultDiv.style.border = "2px solid #10b981";
      } else if (roundedScore > 0) {
        resultDiv.style.backgroundColor = "#fffbeb";
        resultDiv.style.border = "2px solid #f59e0b";
      } else {
        resultDiv.style.backgroundColor = "#fef2f2";
        resultDiv.style.border = "2px solid #ef4444";
      }

      let aiBadge = "";
      if (r.aiEvaluated) {
        aiBadge = `<div style="margin-top:8px; padding:6px 12px; background:#e0e7ff; color:#3730a3; border-radius:8px; font-size:20px;">🤖 <strong>Gemini AI ពិនិត្យ៖</strong> ${this.escapeHtml(r.aiReason)}</div>`;
      }

      resultDiv.innerHTML = `
        <div style="margin-bottom:6px;"><strong>📝 ចម្លើយសិស្ស៖</strong> <span style="color:#4338ca; font-weight:700;">${studentDisplay}</span></div>
        <div style="margin-bottom:6px;"><strong>✅ ចម្លើយត្រឹមត្រូវ៖</strong> <span style="color:#059669; font-weight:700;">${correctDisplay}</span></div>
        <div style="font-weight:700; color:${roundedScore === r.points ? '#047857' : (roundedScore > 0 ? '#ca8a04' : '#b91c1c')};">
          ${roundedScore === r.points ? '✅ ត្រឹមត្រូវ' : (roundedScore > 0 ? '⚠️ ត្រឹមត្រូវផ្នែកខ្លះ' : '❌ មិនត្រឹមត្រូវ')} (+${roundedScore} / ${r.points} ពិន្ទុ)
        </div>
        ${aiBadge}
      `;

      card.appendChild(resultDiv);
    });
  },

  formatStudentAnswerDisplay(r) {
    const raw = String(r.studentAnswer || "").trim();
    if (!raw || raw === "[]" || raw === '["","",""]') {
      return `<i style="color:#ef4444;">មិនបានឆ្លើយ</i>`;
    }
    try {
      const parsed = JSON.parse(raw);
      if (r.type === "MATCHING" && Array.isArray(parsed)) {
        return parsed.map(item => `<span class="badge-tag">${this.escapeHtml(item.left)} ➔ ${this.escapeHtml(item.right)}</span>`).join(" ");
      }
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean).map(item => `<span class="badge-tag">${this.escapeHtml(item)}</span>`).join(" ");
      }
      return this.escapeHtml(String(parsed));
    } catch(e) {
      return this.escapeHtml(raw);
    }
  },

  formatCorrectAnswerDisplay(r) {
    if (r.type === "MATCHING") {
      try {
        const parsedMap = typeof r.correctAnswer === "string" ? JSON.parse(r.correctAnswer) : (r.correctAnswer || {});
        let dataExtra = {};
        try { dataExtra = typeof r.dataExtra === "string" ? JSON.parse(r.dataExtra) : (r.dataExtra || {}); } catch(e) {}
        const leftList = dataExtra.left || [];
        const rightList = dataExtra.right || [];
        const pairs = [];
        Object.keys(parsedMap).forEach(key => {
          let leftVal = (!isNaN(key) && leftList[Number(key)] !== undefined) ? leftList[Number(key)] : key;
          let rightVal = (!isNaN(parsedMap[key]) && rightList[Number(parsedMap[key])] !== undefined) ? rightList[Number(parsedMap[key])] : parsedMap[key];
          pairs.push(`${this.escapeHtml(leftVal)} ➔ ${this.escapeHtml(rightVal)}`);
        });
        return pairs.map(p => `<span class="badge-tag-green">${p}</span>`).join(" ");
      } catch(e) {
        return this.escapeHtml(r.correctAnswer || "-");
      }
    }
    return this.escapeHtml(r.correctAnswer || "-");
  },

  resetExamAndLogin() {
    this.clearMatchingState();
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.examSubmitted = false;
    this.currentStudent = null;
    this.questions = [];

    const oldSummary = document.getElementById("examResultSummary");
    if (oldSummary) oldSummary.remove();

    document.getElementById("passwordInput").value = "";
    document.getElementById("examSection").classList.add("hidden");
    document.getElementById("loginSection").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  // ==========================================
  // HELPERS: AUDIO, TTS, STRING UTILS
  // ==========================================
  showLoginMessage(msg, isError) {
    const el = document.getElementById("loginMessage");
    if (!el) return;
    el.innerText = msg;
    el.style.color = isError ? "red" : "green";
  },

  normalizeAnswer(val) {
    return String(val || "").trim().toLowerCase().replace(/\s+/g, "");
  },

  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  detectLanguageCode(langInput, fallbackText = "") {
    if (!langInput) {
      if (/[\u4e00-\u9fa5]/.test(fallbackText)) return "zh-CN";
      return "km-KH";
    }
    let l = String(langInput).trim().toLowerCase();
    if (l.startsWith("zh") || l.includes("chinese")) return "zh-CN";
    if (l.startsWith("en") || l.includes("english")) return "en-US";
    if (l.startsWith("km") || l.includes("khmer")) return "km-KH";
    return langInput;
  },

  speakText(text, lang = "km-KH") {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const targetLang = this.detectLanguageCode(lang, text);
    const utterance = new SpeechSynthesisUtterance(String(text).trim());
    utterance.lang = targetLang;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  },

  playSound(type) {
    try {
      if (!window.audioCtx) {
        window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (window.audioCtx.state === 'suspended') window.audioCtx.resume();
      const osc = window.audioCtx.createOscillator();
      const gain = window.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(window.audioCtx.destination);

      if (type === 'hover') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, window.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.02, window.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, window.audioCtx.currentTime + 0.05);
        osc.start();
        osc.stop(window.audioCtx.currentTime + 0.05);
      } else if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, window.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, window.audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, window.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, window.audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(window.audioCtx.currentTime + 0.1);
      }
    } catch(e) {}
  },

  attachSoundEffects() {
    const interactables = document.querySelectorAll('button, .primary-btn, .submit-btn, .tts-btn, .match-item, .option, .draggable-word');
    interactables.forEach(el => {
      if (!el.dataset.hasSound) {
        el.dataset.hasSound = "true";
        el.addEventListener('mouseenter', () => this.playSound('hover'));
        el.addEventListener('mousedown', () => this.playSound('click'));
      }
    });
  },

  escapeHtml(val) {
    return String(val || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  escapeAttribute(val) {
    return String(val || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
};

window.ExamEngine = ExamEngine;
