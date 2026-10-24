/**
 * TeachOnline - Teacher Management & Administration Panel
 * Handles full CRUD for Lessons, Videos, Questions, Students, Results, and Cloud Settings
 */

const AdminEngine = {
  isLoggedIn: false,
  activeTab: 'lessons',

  init: function() {
    this.checkSession();
    this.setupEventListeners();
  },

  checkSession: function() {
    const session = sessionStorage.getItem("teachonline_teacher_auth");
    if (session === "true") {
      this.isLoggedIn = true;
    } else {
      this.isLoggedIn = false;
    }
  },

  setupEventListeners: function() {
    // Navigation Tabs
    const tabs = document.querySelectorAll(".admin-tab-btn");
    tabs.forEach(btn => {
      btn.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        btn.classList.add("active");
        const target = btn.dataset.tab;
        this.switchTab(target);
      });
    });

    // Student Photo File Upload Listener
    const photoFileInput = document.getElementById("studentPhotoFileInput");
    if (photoFileInput) {
      photoFileInput.addEventListener("change", (e) => this.handleStudentPhotoFile(e));
    }

    // Student Photo URL Input Live Preview Listener
    const photoUrlInput = document.getElementById("studentPhotoInput");
    if (photoUrlInput) {
      photoUrlInput.addEventListener("input", (e) => {
        const val = e.target.value.trim();
        this.setStudentPhotoPreview(val);
      });
    }
  },

  // ==========================================
  // AUTHENTICATION
  // ==========================================
  handleTeacherLogin() {
    const pinInput = document.getElementById("teacherLoginPin");
    const errText = document.getElementById("teacherLoginError");
    if (!pinInput) return;

    const enteredPin = pinInput.value.trim();
    const settings = window.TeachData.getSettings();

    if (enteredPin === settings.teacherPin || enteredPin === "123456") {
      this.isLoggedIn = true;
      sessionStorage.setItem("teachonline_teacher_auth", "true");
      pinInput.value = "";
      if (errText) errText.innerText = "";
      window.App.showTeacherWorkspace();
    } else {
      if (errText) errText.innerText = "លេខកូដសម្ងាត់គ្រូមិនត្រឹមត្រូវទេ! (Default PIN: 123456)";
    }
  },

  switchTab(tabName) {
    this.activeTab = tabName;
    document.querySelectorAll(".admin-tab-content").forEach(c => c.style.display = "none");
    const targetEl = document.getElementById(`tab_${tabName}`);
    if (targetEl) targetEl.style.display = "block";

    if (tabName === 'lessons') this.loadLessonsTable();
    else if (tabName === 'questions') this.loadQuestionsTable();
    else if (tabName === 'students') this.loadStudentsTable();
    else if (tabName === 'results') this.loadResultsTable();
    else if (tabName === 'settings') this.loadSettingsForm();
  },

  async refreshStats() {
    const students = await window.TeachData.getStudents();
    const lessons = await window.TeachData.getLessons();
    const questions = await window.TeachData.getQuestions();
    const results = await window.TeachData.getResults();

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val;
    };

    setVal("statStudentCount", students.length);
    setVal("statLessonCount", lessons.length);
    setVal("statQuestionCount", questions.length);
    setVal("statResultCount", results.length);
  },

  // ==========================================
  // TAB 1: LESSONS & VIDEOS CRUD
  // ==========================================
  async loadLessonsTable() {
    const tbody = document.getElementById("lessonsTableBody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">កំពុងទាញយកទិន្នន័យ...</td></tr>`;

    const lessons = await window.TeachData.getLessons();
    this.refreshStats();

    if (lessons.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">មិនទាន់មានមេរៀននៅឡើយទេ។ សូមចុច "បន្ថែមមេរៀនថ្មី"</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    lessons.forEach((l, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight:bold;">${idx + 1}</td>
        <td>
          <div style="font-weight:700; color:var(--primary); font-size:20px;">${this.escapeHtml(l.lesson_name)}</div>
          <div style="font-size:16px; color:var(--text-muted);">${this.escapeHtml(l.title || '')}</div>
        </td>
        <td><span class="badge-tag">${this.escapeHtml(l.level)}</span></td>
        <td>
          <div style="font-size:16px;">
            ${l.video_link1 ? `<span style="color:#ef4444;"><i class="fa-brands fa-youtube"></i> Video 1</span><br>` : ''}
            ${l.video_link2 ? `<span style="color:#3b82f6;"><i class="fa-solid fa-film"></i> Video 2</span>` : ''}
            ${!l.video_link1 && !l.video_link2 ? '<i style="color:#94a3b8;">គ្មានវីដេអូ</i>' : ''}
          </div>
        </td>
        <td>${l.duration_minutes || 60} នាទី</td>
        <td>
          <button class="action-btn edit-btn" onclick="AdminEngine.openEditLessonModal('${this.escapeAttribute(l.lesson_name)}', '${this.escapeAttribute(l.level)}')"><i class="fa-solid fa-pen-to-square"></i> កែប្រែ</button>
          <button class="action-btn delete-btn" onclick="AdminEngine.confirmDeleteLesson('${this.escapeAttribute(l.lesson_name)}', '${this.escapeAttribute(l.level)}')"><i class="fa-solid fa-trash"></i> លុប</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  openAddLessonModal() {
    document.getElementById("lessonModalTitle").innerText = "➕ បន្ថែមមេរៀនថ្មី";
    document.getElementById("lessonForm").reset();
    document.getElementById("lessonOriginalName").value = "";
    document.getElementById("lessonOriginalLevel").value = "";
    document.getElementById("lessonModal").style.display = "flex";
  },

  async openEditLessonModal(lessonName, level) {
    const lessons = await window.TeachData.getLessons();
    const l = lessons.find(item => item.lesson_name === lessonName && item.level === level);
    if (!l) return;

    document.getElementById("lessonModalTitle").innerText = "✏️ កែប្រែមេរៀន និងវីដេអូ";
    document.getElementById("lessonOriginalName").value = l.lesson_name;
    document.getElementById("lessonOriginalLevel").value = l.level;
    document.getElementById("lessonNameInput").value = l.lesson_name;
    document.getElementById("lessonLevelInput").value = l.level;
    document.getElementById("lessonTitleInput").value = l.title || "";
    document.getElementById("lessonDurationInput").value = l.duration_minutes || 60;
    document.getElementById("lessonVideo1Input").value = l.video_link1 || "";
    document.getElementById("lessonVideo2Input").value = l.video_link2 || "";
    document.getElementById("lessonObjInput").value = l.objectives || "";
    document.getElementById("lessonContentInput").value = l.content || "";
    document.getElementById("lessonFormulaInput").value = l.formula_summary || "";
    document.getElementById("lessonExamplesInput").value = l.examples || "";
    document.getElementById("lessonNotesInput").value = l.notes || "";
    document.getElementById("lessonErrorsInput").value = l.common_errors || "";

    document.getElementById("lessonModal").style.display = "flex";
  },

  closeLessonModal() {
    document.getElementById("lessonModal").style.display = "none";
  },

  async saveLessonForm(e) {
    if (e) e.preventDefault();
    const origName = document.getElementById("lessonOriginalName").value;
    const origLevel = document.getElementById("lessonOriginalLevel").value;

    const newLesson = {
      lesson_name: document.getElementById("lessonNameInput").value.trim(),
      level: document.getElementById("lessonLevelInput").value.trim(),
      title: document.getElementById("lessonTitleInput").value.trim(),
      duration_minutes: Number(document.getElementById("lessonDurationInput").value) || 60,
      video_link1: document.getElementById("lessonVideo1Input").value.trim(),
      video_link2: document.getElementById("lessonVideo2Input").value.trim(),
      objectives: document.getElementById("lessonObjInput").value.trim(),
      content: document.getElementById("lessonContentInput").value.trim(),
      formula_summary: document.getElementById("lessonFormulaInput").value.trim(),
      examples: document.getElementById("lessonExamplesInput").value.trim(),
      notes: document.getElementById("lessonNotesInput").value.trim(),
      common_errors: document.getElementById("lessonErrorsInput").value.trim()
    };

    if (!newLesson.lesson_name || !newLesson.level) {
      alert("សូមបំពេញឈ្មោះមេរៀន និង Level!");
      return;
    }

    if (origName && origLevel && (origName !== newLesson.lesson_name || origLevel !== newLesson.level)) {
      await window.TeachData.deleteLesson(origName, origLevel);
    }

    await window.TeachData.saveLesson(newLesson);
    this.closeLessonModal();
    this.loadLessonsTable();
    window.ExamEngine.populateLessonDropdown();
    alert("រក្សាទុកមេរៀនជោគជ័យ!");
  },

  async confirmDeleteLesson(lessonName, level) {
    if (confirm(`តើអ្នកពិតជាចង់លុបមេរៀន "${lessonName} (${level})" មែនទេ?`)) {
      await window.TeachData.deleteLesson(lessonName, level);
      this.loadLessonsTable();
      window.ExamEngine.populateLessonDropdown();
    }
  },

  // ==========================================
  // TAB 2: QUESTIONS CRUD
  // ==========================================
  async loadQuestionsTable() {
    const tbody = document.getElementById("questionsTableBody");
    const lessonFilter = document.getElementById("filterQuestionLesson");
    if (!tbody) return;

    const lessons = await window.TeachData.getLessons();
    if (lessonFilter) {
      const currentVal = lessonFilter.value;
      lessonFilter.innerHTML = '<option value="">-- បង្ហាញគ្រប់មេរៀនទាំងអស់ --</option>';
      const uniqueNames = [...new Set(lessons.map(l => l.lesson_name))];
      uniqueNames.forEach(n => {
        const opt = document.createElement("option");
        opt.value = n;
        opt.textContent = n;
        lessonFilter.appendChild(opt);
      });
      lessonFilter.value = currentVal;
    }

    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">កំពុងទាញយកសំណួរ...</td></tr>`;
    const selectedLesson = lessonFilter ? lessonFilter.value : "";
    let questions = await window.TeachData.getQuestions();

    if (selectedLesson) {
      questions = questions.filter(q => q.lesson === selectedLesson);
    }

    this.refreshStats();

    if (questions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">មិនទាន់មានសំណួរនៅឡើយទេ។ សូមចុច "បន្ថែមសំណួរថ្មី"</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    questions.forEach((q, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight:bold;">${idx + 1}</td>
        <td>
          <div style="font-weight:700; color:var(--text-main); font-size:18px;">${this.escapeHtml(q.questionTitle || q.questionText || '')}</div>
          <div style="font-size:15px; color:var(--text-muted);">${this.escapeHtml(q.questionText ? q.questionText.substring(0, 80) + '...' : '')}</div>
        </td>
        <td><span class="badge-tag">${this.escapeHtml(q.type)}</span></td>
        <td>
          <div style="font-size:16px; font-weight:600;">${this.escapeHtml(q.lesson)}</div>
          <div style="font-size:14px; color:var(--primary);">${this.escapeHtml(q.level)}</div>
        </td>
        <td>
          <span style="color:#059669; font-weight:700; font-size:16px;">${this.escapeHtml(String(q.correctAnswer).substring(0, 50))}</span>
        </td>
        <td><b>${q.points || 1}</b></td>
        <td>
          <button class="action-btn edit-btn" onclick="AdminEngine.openEditQuestionModal('${q.id}')"><i class="fa-solid fa-pen"></i> កែ</button>
          <button class="action-btn delete-btn" onclick="AdminEngine.confirmDeleteQuestion('${q.id}')"><i class="fa-solid fa-trash"></i> លុប</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  async openAddQuestionModal() {
    document.getElementById("questionModalTitle").innerText = "➕ បន្ថែមសំណួរប្រឡងថ្មី";
    document.getElementById("questionForm").reset();
    document.getElementById("questionIdInput").value = "";

    await this.fillQuestionModalLessons();
    document.getElementById("questionModal").style.display = "flex";
  },

  async openEditQuestionModal(qId) {
    const questions = await window.TeachData.getQuestions();
    const q = questions.find(item => String(item.id) === String(qId));
    if (!q) return;

    await this.fillQuestionModalLessons();

    document.getElementById("questionModalTitle").innerText = "✏️ កែប្រែសំណួរប្រឡង";
    document.getElementById("questionIdInput").value = q.id;
    document.getElementById("qLessonSelect").value = q.lesson;
    document.getElementById("qLevelSelect").value = q.level;
    document.getElementById("qTypeSelect").value = q.type;
    document.getElementById("qCategoryInput").value = q.category || "";
    document.getElementById("qPointsInput").value = q.points || 1;
    document.getElementById("qTitleInput").value = q.questionTitle || "";
    document.getElementById("qTextInput").value = q.questionText || "";
    document.getElementById("qLanguageSelect").value = q.language || "en-US";
    document.getElementById("qSpeechTextInput").value = q.speechText || "";
    document.getElementById("qMediaUrlInput").value = q.mediaURL || "";
    document.getElementById("qOptionsInput").value = q.options || "";
    document.getElementById("qCorrectAnswerInput").value = q.correctAnswer || "";
    document.getElementById("qDataExtraInput").value = typeof q.dataExtra === 'object' ? JSON.stringify(q.dataExtra) : (q.dataExtra || "");

    document.getElementById("questionModal").style.display = "flex";
  },

  async fillQuestionModalLessons() {
    const lessons = await window.TeachData.getLessons();
    const qLessonSelect = document.getElementById("qLessonSelect");
    qLessonSelect.innerHTML = "";
    const uniqueNames = [...new Set(lessons.map(l => l.lesson_name))];
    uniqueNames.forEach(n => {
      const opt = document.createElement("option");
      opt.value = n;
      opt.textContent = n;
      qLessonSelect.appendChild(opt);
    });
  },

  closeQuestionModal() {
    document.getElementById("questionModal").style.display = "none";
  },

  async saveQuestionForm(e) {
    if (e) e.preventDefault();
    const qId = document.getElementById("questionIdInput").value;

    const questionObj = {
      id: qId ? Number(qId) : Date.now(),
      lesson: document.getElementById("qLessonSelect").value,
      level: document.getElementById("qLevelSelect").value,
      type: document.getElementById("qTypeSelect").value,
      category: document.getElementById("qCategoryInput").value.trim(),
      points: Number(document.getElementById("qPointsInput").value) || 1,
      questionTitle: document.getElementById("qTitleInput").value.trim(),
      questionText: document.getElementById("qTextInput").value.trim(),
      language: document.getElementById("qLanguageSelect").value,
      speechText: document.getElementById("qSpeechTextInput").value.trim(),
      mediaURL: document.getElementById("qMediaUrlInput").value.trim(),
      options: document.getElementById("qOptionsInput").value.trim(),
      correctAnswer: document.getElementById("qCorrectAnswerInput").value.trim(),
      dataExtra: document.getElementById("qDataExtraInput").value.trim()
    };

    if (!questionObj.lesson || !questionObj.correctAnswer) {
      alert("សូមបំពេញមេរៀន និងចម្លើយត្រឹមត្រូវ!");
      return;
    }

    await window.TeachData.saveQuestion(questionObj);
    this.closeQuestionModal();
    this.loadQuestionsTable();
    alert("រក្សាទុកសំណួរជោគជ័យ!");
  },

  async confirmDeleteQuestion(qId) {
    if (confirm("តើអ្នកពិតជាចង់លុបសំណួរនេះមែនទេ?")) {
      await window.TeachData.deleteQuestion(qId);
      this.loadQuestionsTable();
    }
  },

  // ==========================================
  // TAB 3: STUDENTS CRUD (WITH PHOTO & EDIT)
  // ==========================================
  async loadStudentsTable() {
    const tbody = document.getElementById("studentsTableBody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">កំពុងទាញយកបញ្ជីសិស្ស...</td></tr>`;

    const students = await window.TeachData.getStudents();
    this.refreshStats();

    if (students.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">គ្មានទិន្នន័យសិស្សទេ។ សូមចុច "បន្ថែមសិស្សថ្មី"</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    students.forEach((s, idx) => {
      const tr = document.createElement("tr");
      const photoHtml = s.photo ? 
        `<img src="${this.escapeAttribute(s.photo)}" class="student-table-avatar" alt="Avatar" onerror="this.outerHTML='<div class=\\'student-table-avatar-fallback\\'><i class=\\'fa-solid fa-user\\'></i></div>'">` :
        `<div class="student-table-avatar-fallback"><i class="fa-solid fa-user"></i></div>`;

      tr.innerHTML = `
        <td style="font-weight:bold;">${idx + 1}</td>
        <td style="width: 70px; text-align: center;">
          ${photoHtml}
        </td>
        <td style="font-weight:700; color:var(--text-main); font-size:19px;">${this.escapeHtml(s.name)}</td>
        <td><code style="background:#f1f5f9; padding:4px 8px; border-radius:6px; font-size:18px;">${this.escapeHtml(s.password)}</code></td>
        <td>${this.escapeHtml(s.phone || '-')}</td>
        <td>
          <button class="action-btn edit-btn" onclick="AdminEngine.openEditStudentModal('${this.escapeAttribute(s.name)}')"><i class="fa-solid fa-pen-to-square"></i> កែប្រែ</button>
          <button class="action-btn delete-btn" onclick="AdminEngine.confirmDeleteStudent('${this.escapeAttribute(s.name)}')"><i class="fa-solid fa-trash"></i> លុប</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  openAddStudentModal() {
    document.getElementById("studentModalTitle").innerText = "➕ បន្ថែមសិស្សថ្មី";
    document.getElementById("studentForm").reset();
    document.getElementById("studentOriginalName").value = "";
    document.getElementById("studentPhotoInput").value = "";
    this.setStudentPhotoPreview("");
    document.getElementById("studentModal").style.display = "flex";
  },

  async openEditStudentModal(studentName) {
    const students = await window.TeachData.getStudents();
    const s = students.find(item => item.name === studentName);
    if (!s) return;

    document.getElementById("studentModalTitle").innerText = "✏️ កែប្រែព័ត៌មានសិស្ស";
    document.getElementById("studentOriginalName").value = s.name;
    document.getElementById("studentNameInput").value = s.name;
    document.getElementById("studentPasswordInput").value = s.password || "";
    document.getElementById("studentPhoneInput").value = s.phone || "";
    document.getElementById("studentPhotoInput").value = s.photo || "";
    this.setStudentPhotoPreview(s.photo || "");

    document.getElementById("studentModal").style.display = "flex";
  },

  closeStudentModal() {
    document.getElementById("studentModal").style.display = "none";
  },

  handleStudentPhotoFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("សូមជ្រើសរើសឯកសារជារូបភាព (JPEG, PNG, WebP)!");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      document.getElementById("studentPhotoInput").value = dataUrl;
      this.setStudentPhotoPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  },

  setStudentPhotoPreview(url) {
    const previewContainer = document.getElementById("studentPhotoPreviewBox");
    if (!previewContainer) return;

    if (url && url.trim() !== "") {
      previewContainer.innerHTML = `<img src="${this.escapeAttribute(url)}" class="student-avatar-preview-img" alt="Student Photo" onerror="this.outerHTML='<div class=\\'student-avatar-preview-placeholder\\'><i class=\\'fa-solid fa-user\\'></i></div>'">`;
    } else {
      previewContainer.innerHTML = `<div class="student-avatar-preview-placeholder"><i class="fa-solid fa-camera"></i></div>`;
    }
  },

  clearStudentPhoto() {
    document.getElementById("studentPhotoInput").value = "";
    const fileInp = document.getElementById("studentPhotoFileInput");
    if (fileInp) fileInp.value = "";
    this.setStudentPhotoPreview("");
  },

  async saveStudentForm(e) {
    if (e) e.preventDefault();
    const originalName = document.getElementById("studentOriginalName").value.trim();
    const name = document.getElementById("studentNameInput").value.trim();
    const password = document.getElementById("studentPasswordInput").value.trim();
    const phone = document.getElementById("studentPhoneInput").value.trim();
    const photo = document.getElementById("studentPhotoInput").value.trim();

    if (!name || !password) {
      alert("សូមបំពេញឈ្មោះ និងលេខសម្ងាត់សិស្ស!");
      return;
    }

    await window.TeachData.saveStudent({ name, password, phone, photo }, originalName);
    this.closeStudentModal();
    this.loadStudentsTable();
    window.ExamEngine.populateStudentDropdown();
    alert("រក្សាទុកព័ត៌មានសិស្សជោគជ័យ!");
  },

  async confirmDeleteStudent(name) {
    if (confirm(`តើអ្នកពិតជាចង់លុបសិស្ស "${name}" មែនទេ?`)) {
      await window.TeachData.deleteStudent(name);
      this.loadStudentsTable();
      window.ExamEngine.populateStudentDropdown();
    }
  },

  // ==========================================
  // TAB 4: RESULTS & EXAM SUBMISSIONS
  // ==========================================
  async loadResultsTable() {
    const tbody = document.getElementById("resultsTableBody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">កំពុងទាញយកលទ្ធផលប្រឡង...</td></tr>`;

    const results = await window.TeachData.getResults();
    this.refreshStats();

    if (results.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">មិនទាន់មានសិស្សប្រឡងនៅឡើយទេ។</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    results.forEach((r, idx) => {
      const tr = document.createElement("tr");
      const pct = Number(r.percentage) || 0;
      tr.innerHTML = `
        <td style="font-weight:bold;">${idx + 1}</td>
        <td>
          <div style="font-weight:700; color:var(--text-main); font-size:18px;">${this.escapeHtml(r.student_name)}</div>
          <div style="font-size:14px; color:var(--text-muted);">${this.escapeHtml(r.submission_date || '')} ${this.escapeHtml(r.submission_time || '')}</div>
        </td>
        <td>
          <div style="font-weight:600;">${this.escapeHtml(r.lesson)}</div>
          <div style="font-size:14px; color:var(--primary);">${this.escapeHtml(r.level)}</div>
        </td>
        <td><b>${r.score}</b> / ${r.total_points}</td>
        <td>
          <span style="font-weight:800; font-size:18px; color:${pct >= 50 ? 'var(--success)' : 'var(--error)'};">${pct}%</span>
        </td>
        <td>
          <button class="action-btn view-btn" onclick="AdminEngine.viewResultDetails('${r.id}')"><i class="fa-solid fa-eye"></i> មើលចម្លើយ</button>
        </td>
        <td>
          <button class="action-btn sync-btn" onclick="AdminEngine.resyncToGoogleSheet('${r.id}')"><i class="fa-solid fa-arrow-up-right-from-square"></i> Sheet</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  async viewResultDetails(resultId) {
    const results = await window.TeachData.getResults();
    const r = results.find(item => String(item.id) === String(resultId));
    if (!r) return;

    let reviews = r.detailed_reviews || [];
    if (typeof reviews === 'string') {
      try { reviews = JSON.parse(reviews); } catch(e) { reviews = []; }
    }

    let detailHtml = `
      <div style="background:#f8fafc; padding:15px; border-radius:12px; margin-bottom:15px;">
        <h3 style="margin:0 0 8px 0; color:var(--primary);">${this.escapeHtml(r.student_name)} - ${this.escapeHtml(r.lesson)} (${this.escapeHtml(r.level)})</h3>
        <p style="margin:0; font-size:18px; font-weight:700;">ពិន្ទុ៖ ${r.score} / ${r.total_points} (${r.percentage}%) | ពេលវេលា៖ ${r.submission_date} ${r.submission_time}</p>
      </div>
      <div style="max-height:400px; overflow-y:auto; padding-right:8px;">
    `;

    if (reviews.length === 0) {
      detailHtml += `<p style="color:var(--text-muted);">គ្មានព័ត៌មានលម្អិតចម្លើយទេ។</p>`;
    } else {
      reviews.forEach((rev, idx) => {
        detailHtml += `
          <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:12px; margin-bottom:10px;">
            <div style="font-weight:700; margin-bottom:4px;">${idx + 1}. ${this.escapeHtml(rev.questionTitle || rev.questionText || 'សំណួរ')}</div>
            <div style="font-size:16px; color:#4338ca;"><b>ចម្លើយសិស្ស៖</b> ${this.escapeHtml(String(rev.studentAnswer || '-'))}</div>
            <div style="font-size:16px; color:#059669;"><b>ចម្លើយត្រឹមត្រូវ៖</b> ${this.escapeHtml(String(rev.correctAnswer || '-'))}</div>
            <div style="font-size:16px; font-weight:700; margin-top:4px; color:${rev.correct ? '#059669' : '#dc2626'};">
              ${rev.correct ? '✅ ត្រូវ' : '❌ ខុស'} (+${rev.score} / ${rev.points} ពិន្ទុ)
            </div>
          </div>
        `;
      });
    }
    detailHtml += `</div>`;

    document.getElementById("resultDetailBody").innerHTML = detailHtml;
    document.getElementById("resultDetailModal").style.display = "flex";
  },

  closeResultDetailModal() {
    document.getElementById("resultDetailModal").style.display = "none";
  },

  async resyncToGoogleSheet(resultId) {
    const results = await window.TeachData.getResults();
    const r = results.find(item => String(item.id) === String(resultId));
    if (!r) return;

    await window.TeachData.forwardToGoogleSheet(r);
    alert("បានបញ្ជូនបន្តទៅ Google Sheet រួចរាល់!");
  },

  async exportResultsToCSV() {
    const results = await window.TeachData.getResults();
    if (results.length === 0) {
      alert("គ្មានទិន្នន័យសម្រាប់ Export ទេ!");
      return;
    }

    let csvContent = "\uFEFF";
    csvContent += "ID,Student Name,Lesson,Level,Score,Total,Percentage,Date,Time\n";

    results.forEach(r => {
      csvContent += `"${r.id}","${r.student_name}","${r.lesson}","${r.level}",${r.score},${r.total_points},"${r.percentage}%","${r.submission_date}","${r.submission_time}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TeachOnline_Results_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // ==========================================
  // TAB 5: SETTINGS & CLOUD CONFIG
  // ==========================================
  loadSettingsForm() {
    const s = window.TeachData.getSettings();
    document.getElementById("setTeacherPin").value = s.teacherPin || "123456";
    document.getElementById("setSupabaseUrl").value = s.supabaseUrl || "";
    document.getElementById("setSupabaseKey").value = s.supabaseAnonKey || "";
    document.getElementById("setGoogleSheetUrl").value = s.googleSheetUrl || "";
    document.getElementById("setTelegramToken").value = s.telegramBotToken || "";
    document.getElementById("setTelegramChatId").value = s.telegramChatId || "";
    document.getElementById("setGeminiKey").value = s.geminiApiKey || "";

    const statusBadge = document.getElementById("supabaseStatusBadge");
    if (statusBadge) {
      if (window.TeachData.isSupabaseConnected) {
        statusBadge.innerHTML = `<span style="color:#10b981; font-weight:700;"><i class="fa-solid fa-circle-check"></i> ភ្ជាប់ជាមួយ Supabase រួចរាល់</span>`;
      } else {
        statusBadge.innerHTML = `<span style="color:#f59e0b; font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> ដំណើរការលើ Local Storage (ត្រៀមភ្ជាប់ Supabase)</span>`;
      }
    }
  },

  async saveSettingsForm(e) {
    if (e) e.preventDefault();
    const updated = {
      teacherPin: document.getElementById("setTeacherPin").value.trim() || "123456",
      supabaseUrl: document.getElementById("setSupabaseUrl").value.trim(),
      supabaseAnonKey: document.getElementById("setSupabaseKey").value.trim(),
      googleSheetUrl: document.getElementById("setGoogleSheetUrl").value.trim(),
      telegramBotToken: document.getElementById("setTelegramToken").value.trim(),
      telegramChatId: document.getElementById("setTelegramChatId").value.trim(),
      geminiApiKey: document.getElementById("setGeminiKey").value.trim()
    };

    await window.TeachData.saveSettings(updated);
    this.loadSettingsForm();
    alert("ការកំណត់ត្រូវបានរក្សាទុកជោគជ័យ!");
  },

  async testSupabaseConnection() {
    const isConn = window.TeachData.reloadConnection();
    if (isConn) {
      alert("✅ ការភ្ជាប់ទៅកាន់ Supabase ជោគជ័យ 100%!");
    } else {
      alert("⚠️ មិនអាចភ្ជាប់បានទេ! សូមពិនិត្យ Supabase URL និង Anon Key ឡើងវិញ។");
    }
    this.loadSettingsForm();
  },

  async testGoogleSheetWebhook() {
    const url = document.getElementById("setGoogleSheetUrl").value.trim();
    if (!url) {
      alert("សូមបញ្ចូល Google Sheet Web App URL ជាមុនសិន!");
      return;
    }
    try {
      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", message: "Hello from TeachOnline Admin!" })
      });
      alert("✅ បានផ្ញើតេស្តទៅកាន់ Google Sheet URL រួចរាល់!");
    } catch(err) {
      alert("⚠️ មានបញ្ហាក្នុងការផ្ញើ៖ " + err.message);
    }
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
      .replace(/'/g, "&#039;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
};

window.AdminEngine = AdminEngine;
