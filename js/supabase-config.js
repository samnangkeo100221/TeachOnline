/**
 * Supabase Client & Data Synchronization Layer for TeachOnline
 * Handles Supabase CRUD, LocalStorage fallback, and Google Sheet Forwarding
 */

const TeachData = {
  supabaseClient: null,
  isSupabaseConnected: false,

  /**
   * Initialize Supabase client if URL and Key are available
   */
  init: function() {
    const settings = this.getSettings();
    if (settings.supabaseUrl && settings.supabaseAnonKey && window.supabase) {
      try {
        this.supabaseClient = window.supabase.createClient(
          settings.supabaseUrl.trim(),
          settings.supabaseAnonKey.trim()
        );
        this.isSupabaseConnected = true;
        console.log("Supabase client initialized successfully");
      } catch (err) {
        console.warn("Could not initialize Supabase:", err);
        this.isSupabaseConnected = false;
      }
    } else {
      this.isSupabaseConnected = false;
    }
  },

  /**
   * Re-initialize after settings are updated
   */
  reloadConnection: function() {
    this.init();
    return this.isSupabaseConnected;
  },

  // ==========================================
  // SETTINGS
  // ==========================================
  getSettings: function() {
    try {
      const stored = localStorage.getItem("teachonline_settings");
      if (stored) {
        return { ...window.INITIAL_DATA.settings, ...JSON.parse(stored) };
      }
    } catch(e) {}
    return { ...window.INITIAL_DATA.settings };
  },

  saveSettings: async function(newSettings) {
    const merged = { ...this.getSettings(), ...newSettings };
    localStorage.setItem("teachonline_settings", JSON.stringify(merged));
    this.init();

    if (this.isSupabaseConnected && this.supabaseClient) {
      try {
        await this.supabaseClient.from('teach_online_settings').upsert({
          id: 'default',
          teacher_pin: merged.teacherPin,
          google_sheet_url: merged.googleSheetUrl,
          telegram_bot_token: merged.telegramBotToken,
          telegram_chat_id: merged.telegramChatId,
          gemini_api_key: merged.geminiApiKey,
          updated_at: new Date().toISOString()
        });
      } catch(e) {
        console.warn("Supabase settings sync error:", e);
      }
    }
    return merged;
  },

  // ==========================================
  // STUDENTS
  // ==========================================
  getStudents: async function() {
    if (this.isSupabaseConnected && this.supabaseClient) {
      try {
        const { data, error } = await this.supabaseClient
          .from('teach_online_students')
          .select('*')
          .order('name');
        if (!error && Array.isArray(data) && data.length > 0) {
          localStorage.setItem("teachonline_students", JSON.stringify(data));
          return data;
        }
      } catch(e) {
        console.warn("Supabase getStudents failed, falling back to local:", e);
      }
    }

    try {
      const stored = localStorage.getItem("teachonline_students");
      if (stored) return JSON.parse(stored);
    } catch(e) {}

    // Initial default
    localStorage.setItem("teachonline_students", JSON.stringify(window.INITIAL_DATA.students));
    return window.INITIAL_DATA.students;
  },

  saveStudent: async function(student) {
    let list = await this.getStudents();
    const existingIndex = list.findIndex(s => String(s.name).trim().toLowerCase() === String(student.name).trim().toLowerCase());
    
    if (existingIndex > -1) {
      list[existingIndex] = { ...list[existingIndex], ...student };
    } else {
      student.id = Date.now();
      list.push(student);
    }
    localStorage.setItem("teachonline_students", JSON.stringify(list));

    if (this.isSupabaseConnected && this.supabaseClient) {
      try {
        await this.supabaseClient
          .from('teach_online_students')
          .upsert({
            name: student.name,
            password: student.password,
            phone: student.phone || ''
          }, { onConflict: 'name' });
      } catch(e) {
        console.warn("Supabase student save failed:", e);
      }
    }
    return list;
  },

  deleteStudent: async function(studentName) {
    let list = await this.getStudents();
    list = list.filter(s => s.name !== studentName);
    localStorage.setItem("teachonline_students", JSON.stringify(list));

    if (this.isSupabaseConnected && this.supabaseClient) {
      try {
        await this.supabaseClient
          .from('teach_online_students')
          .delete()
          .eq('name', studentName);
      } catch(e) {}
    }
    return list;
  },

  authenticateStudent: async function(name, password) {
    const students = await this.getStudents();
    const cleanName = String(name || '').trim();
    const cleanPass = String(password || '').trim();

    const found = students.find(s => 
      String(s.name).trim().toLowerCase() === cleanName.toLowerCase() &&
      String(s.password).trim() === cleanPass
    );

    if (found) {
      return { success: true, student: found };
    }
    return { success: false, message: "ឈ្មោះសិស្ស ឬលេខសម្ងាត់មិនត្រឹមត្រូវទេ!" };
  },

  // ==========================================
  // LESSONS
  // ==========================================
  getLessons: async function() {
    if (this.isSupabaseConnected && this.supabaseClient) {
      try {
        const { data, error } = await this.supabaseClient
          .from('teach_online_lessons')
          .select('*')
          .order('lesson_name');
        if (!error && Array.isArray(data) && data.length > 0) {
          localStorage.setItem("teachonline_lessons", JSON.stringify(data));
          return data;
        }
      } catch(e) {
        console.warn("Supabase getLessons failed, falling back to local:", e);
      }
    }

    try {
      const stored = localStorage.getItem("teachonline_lessons");
      if (stored) return JSON.parse(stored);
    } catch(e) {}

    localStorage.setItem("teachonline_lessons", JSON.stringify(window.INITIAL_DATA.lessons));
    return window.INITIAL_DATA.lessons;
  },

  saveLesson: async function(lesson) {
    let list = await this.getLessons();
    const existingIndex = list.findIndex(l => 
      String(l.lesson_name).trim().toLowerCase() === String(lesson.lesson_name).trim().toLowerCase() &&
      String(l.level).trim().toLowerCase() === String(lesson.level).trim().toLowerCase()
    );

    if (existingIndex > -1) {
      list[existingIndex] = { ...list[existingIndex], ...lesson };
    } else {
      lesson.id = Date.now();
      list.push(lesson);
    }
    localStorage.setItem("teachonline_lessons", JSON.stringify(list));

    if (this.isSupabaseConnected && this.supabaseClient) {
      try {
        await this.supabaseClient
          .from('teach_online_lessons')
          .upsert({
            lesson_name: lesson.lesson_name,
            level: lesson.level,
            title: lesson.title || '',
            duration_minutes: Number(lesson.duration_minutes) || 60,
            video_link1: lesson.video_link1 || '',
            video_link2: lesson.video_link2 || '',
            objectives: lesson.objectives || '',
            content: lesson.content || '',
            formula_summary: lesson.formula_summary || '',
            examples: lesson.examples || '',
            notes: lesson.notes || '',
            common_errors: lesson.common_errors || ''
          }, { onConflict: 'lesson_name,level' });
      } catch(e) {
        console.warn("Supabase lesson save failed:", e);
      }
    }
    return list;
  },

  deleteLesson: async function(lessonName, level) {
    let list = await this.getLessons();
    list = list.filter(l => !(l.lesson_name === lessonName && l.level === level));
    localStorage.setItem("teachonline_lessons", JSON.stringify(list));

    if (this.isSupabaseConnected && this.supabaseClient) {
      try {
        await this.supabaseClient
          .from('teach_online_lessons')
          .delete()
          .eq('lesson_name', lessonName)
          .eq('level', level);
      } catch(e) {}
    }
    return list;
  },

  // ==========================================
  // QUESTIONS
  // ==========================================
  getQuestions: async function(lessonFilter, levelFilter) {
    let questions = [];
    if (this.isSupabaseConnected && this.supabaseClient) {
      try {
        let query = this.supabaseClient.from('teach_online_questions').select('*');
        if (lessonFilter) query = query.eq('lesson', lessonFilter);
        if (levelFilter) query = query.eq('level', levelFilter);
        
        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
          questions = data.map(q => ({
            id: q.id,
            lesson: q.lesson,
            level: q.level,
            type: q.type,
            questionTitle: q.question_title,
            questionText: q.question_text,
            language: q.language,
            audioLanguage: q.audio_language,
            correctAnswer: q.correct_answer,
            options: q.options,
            dataExtra: q.data_extra,
            category: q.category,
            points: Number(q.points) || 1,
            speechText: q.speech_text,
            mediaURL: q.media_url
          }));
          return questions;
        }
      } catch(e) {
        console.warn("Supabase getQuestions failed:", e);
      }
    }

    try {
      const stored = localStorage.getItem("teachonline_questions");
      if (stored) {
        questions = JSON.parse(stored);
      } else {
        questions = window.INITIAL_DATA.questions;
        localStorage.setItem("teachonline_questions", JSON.stringify(questions));
      }
    } catch(e) {
      questions = window.INITIAL_DATA.questions;
    }

    if (lessonFilter && levelFilter) {
      return questions.filter(q => 
        String(q.lesson).trim().toLowerCase() === String(lessonFilter).trim().toLowerCase() &&
        String(q.level).trim().toLowerCase() === String(levelFilter).trim().toLowerCase()
      );
    }
    return questions;
  },

  saveQuestion: async function(question) {
    let list = await this.getQuestions();
    const qId = question.id ? Number(question.id) : Date.now();
    question.id = qId;

    const existingIndex = list.findIndex(q => Number(q.id) === qId);
    if (existingIndex > -1) {
      list[existingIndex] = { ...list[existingIndex], ...question };
    } else {
      list.push(question);
    }
    localStorage.setItem("teachonline_questions", JSON.stringify(list));

    if (this.isSupabaseConnected && this.supabaseClient) {
      try {
        await this.supabaseClient
          .from('teach_online_questions')
          .upsert({
            id: question.id,
            lesson: question.lesson,
            level: question.level,
            type: question.type,
            question_title: question.questionTitle || '',
            question_text: question.questionText || '',
            language: question.language || 'en-US',
            audio_language: question.audioLanguage || 'en-US',
            correct_answer: question.correctAnswer || '',
            options: question.options || '',
            data_extra: typeof question.dataExtra === 'object' ? JSON.stringify(question.dataExtra) : (question.dataExtra || ''),
            category: question.category || '',
            points: Number(question.points) || 1,
            speech_text: question.speechText || '',
            media_url: question.mediaURL || ''
          });
      } catch(e) {
        console.warn("Supabase question save failed:", e);
      }
    }
    return list;
  },

  deleteQuestion: async function(questionId) {
    let list = await this.getQuestions();
    list = list.filter(q => Number(q.id) !== Number(questionId));
    localStorage.setItem("teachonline_questions", JSON.stringify(list));

    if (this.isSupabaseConnected && this.supabaseClient) {
      try {
        await this.supabaseClient
          .from('teach_online_questions')
          .delete()
          .eq('id', questionId);
      } catch(e) {}
    }
    return list;
  },

  // ==========================================
  // EXAM RESULTS & FORWARDING
  // ==========================================
  getResults: async function() {
    if (this.isSupabaseConnected && this.supabaseClient) {
      try {
        const { data, error } = await this.supabaseClient
          .from('teach_online_results')
          .select('*')
          .order('id', { ascending: false });
        if (!error && Array.isArray(data)) {
          return data;
        }
      } catch(e) {
        console.warn("Supabase getResults failed:", e);
      }
    }

    try {
      const stored = localStorage.getItem("teachonline_results");
      if (stored) return JSON.parse(stored);
    } catch(e) {}
    return [];
  },

  saveResult: async function(resultData) {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB"); // dd/mm/yyyy
    const timeStr = now.toLocaleTimeString("en-GB");

    const record = {
      id: Date.now(),
      student_name: resultData.studentName || resultData.student || "Unknown",
      lesson: resultData.lesson,
      level: resultData.level,
      score: Number(resultData.score) || 0,
      total_points: Number(resultData.total || resultData.total_points) || 0,
      percentage: Number(resultData.percentage) || 0,
      submission_date: dateStr,
      submission_time: timeStr,
      detailed_reviews: resultData.reviews || [],
      synced_to_sheet: false,
      created_at: now.toISOString()
    };

    // 1. Save to LocalStorage
    let localResults = [];
    try {
      const stored = localStorage.getItem("teachonline_results");
      if (stored) localResults = JSON.parse(stored);
    } catch(e) {}
    localResults.unshift(record);
    localStorage.setItem("teachonline_results", JSON.stringify(localResults));

    // 2. Save to Supabase
    if (this.isSupabaseConnected && this.supabaseClient) {
      try {
        const { data, error } = await this.supabaseClient
          .from('teach_online_results')
          .insert([record]);
        if (!error) {
          console.log("Result saved to Supabase successfully");
        }
      } catch(err) {
        console.warn("Error inserting result to Supabase:", err);
      }
    }

    // 3. Forward to Google Sheet Web App (if configured)
    this.forwardToGoogleSheet(record);

    // 4. Forward to Telegram
    this.sendTelegramNotification(record);

    return record;
  },

  /**
   * Send submission data to Google Sheet Web App endpoint
   */
  forwardToGoogleSheet: async function(record) {
    const settings = this.getSettings();
    if (!settings.googleSheetUrl || settings.googleSheetUrl.trim() === '') {
      return;
    }

    try {
      const payload = {
        action: "saveResult",
        studentName: record.student_name,
        lesson: record.lesson,
        level: record.level,
        score: record.score,
        total: record.total_points,
        percentage: record.percentage,
        date: record.submission_date,
        time: record.submission_time
      };

      // Use fetch with no-cors or standard POST
      await fetch(settings.googleSheetUrl.trim(), {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      console.log("Forwarded exam result to Google Sheet");
    } catch(err) {
      console.warn("Failed to forward to Google Sheet:", err);
    }
  },

  /**
   * Send Telegram notification message
   */
  sendTelegramNotification: async function(record) {
    const settings = this.getSettings();
    if (!settings.telegramBotToken || !settings.telegramChatId) return;

    try {
      const message = `📝 <b>មានសិស្សប្រឡងរួចរាល់ TeachOnline</b>\n\n` +
                      `👤 <b>ឈ្មោះសិស្ស:</b> ${record.student_name}\n` +
                      `📚 <b>មេរៀន:</b> ${record.lesson} (Level: ${record.level})\n` +
                      `🎯 <b>ពិន្ទុទទួលបាន:</b> ${record.score}/${record.total_points} (<b>${record.percentage}%</b>)\n` +
                      `🕒 <b>កាលបរិច្ឆេទ:</b> ${record.submission_date} ${record.submission_time}`;

      const url = `https://api.telegram.org/bot${settings.telegramBotToken.trim()}/sendMessage`;
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: settings.telegramChatId.trim(),
          text: message,
          parse_mode: "HTML"
        })
      });
    } catch(e) {
      console.warn("Telegram notification error:", e);
    }
  }
};

// Initialize on page load
window.TeachData = TeachData;
window.addEventListener("DOMContentLoaded", () => TeachData.init());
