/**
 * TeachOnline - App State Controller
 * Handles Navigation between:
 * - Portal Selector (Role Selection Gate)
 * - Student Login & Workspace
 * - Teacher Login & Workspace (with Student Preview Mode)
 */

const App = {
  // Current state: 'portal-selector', 'student-login', 'student-workspace', 'teacher-login', 'teacher-workspace'
  currentScreen: 'portal-selector',
  isTeacherPreviewingStudent: false,

  init: function() {
    console.log("TeachOnline Application Initializing with Clean Role Separation...");
    window.TeachData.init();
    window.ExamEngine.init();
    window.AdminEngine.init();

    this.checkExistingSession();
    this.setupEventListeners();
  },

  checkExistingSession: function() {
    // Check if teacher is authenticated
    const isTeacher = sessionStorage.getItem("teachonline_teacher_auth") === "true";
    const studentUser = sessionStorage.getItem("teachonline_student_auth");

    if (isTeacher) {
      this.showTeacherWorkspace();
    } else if (studentUser) {
      try {
        const studentObj = JSON.parse(studentUser);
        window.ExamEngine.currentStudent = studentObj;
        this.showStudentWorkspace(studentObj);
      } catch(e) {
        this.showPortalSelector();
      }
    } else {
      this.showPortalSelector();
    }
  },

  setupEventListeners: function() {
    // Brand click returns to appropriate home
    const brand = document.getElementById("brandLogo");
    if (brand) {
      brand.addEventListener("click", () => {
        if (this.currentScreen === 'teacher-workspace' || this.isTeacherPreviewingStudent) {
          this.showTeacherWorkspace();
        } else if (this.currentScreen === 'student-workspace') {
          // Stay in student workspace
        } else {
          this.showPortalSelector();
        }
      });
    }

    // Role card clicks on landing gate
    const btnSelectStudent = document.getElementById("btnSelectStudent");
    const btnSelectTeacher = document.getElementById("btnSelectTeacher");

    if (btnSelectStudent) {
      btnSelectStudent.addEventListener("click", () => this.showStudentLogin());
    }

    if (btnSelectTeacher) {
      btnSelectTeacher.addEventListener("click", () => this.showTeacherLogin());
    }
  },

  hideAllScreens: function() {
    const screens = [
      "portalSelectorView",
      "studentLoginView",
      "studentWorkspaceView",
      "teacherLoginView",
      "teacherWorkspaceView"
    ];
    screens.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });

    const banner = document.getElementById("teacherPreviewBanner");
    if (banner) banner.style.display = "none";
  },

  // 1. Show Role Selector (ទំព័រដើម ជ្រើសរើសគណនី)
  showPortalSelector: function() {
    this.hideAllScreens();
    this.currentScreen = 'portal-selector';
    this.isTeacherPreviewingStudent = false;

    const el = document.getElementById("portalSelectorView");
    if (el) el.style.display = "block";

    this.updateHeaderStatus("guest");
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  // 2. Show Student Login (ផ្ទាំង Login សិស្ស)
  showStudentLogin: function() {
    this.hideAllScreens();
    this.currentScreen = 'student-login';
    this.isTeacherPreviewingStudent = false;

    const el = document.getElementById("studentLoginView");
    if (el) el.style.display = "block";

    this.updateHeaderStatus("guest");
    window.ExamEngine.populateStudentDropdown();
    window.ExamEngine.populateLessonDropdown();
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  // 3. Show Student Workspace (ផ្ទាំងសិក្សា និងប្រឡងរបស់សិស្ស)
  showStudentWorkspace: function(studentObj) {
    this.hideAllScreens();
    this.currentScreen = 'student-workspace';

    const el = document.getElementById("studentWorkspaceView");
    if (el) el.style.display = "block";

    // Set greeting name
    const nameEl = document.getElementById("studentGreetingName");
    if (nameEl && studentObj) {
      nameEl.innerText = studentObj.name;
    }

    // Show banner if teacher is previewing
    if (this.isTeacherPreviewingStudent) {
      const banner = document.getElementById("teacherPreviewBanner");
      if (banner) banner.style.display = "flex";
      this.updateHeaderStatus("teacher-preview");
    } else {
      this.updateHeaderStatus("student", studentObj ? studentObj.name : "");
    }

    window.ExamEngine.populateLessonDropdown();
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  // 4. Show Teacher Login (ផ្ទាំង Login គ្រូ)
  showTeacherLogin: function() {
    this.hideAllScreens();
    this.currentScreen = 'teacher-login';
    this.isTeacherPreviewingStudent = false;

    const el = document.getElementById("teacherLoginView");
    if (el) el.style.display = "block";

    this.updateHeaderStatus("guest");
    const pinInput = document.getElementById("teacherLoginPin");
    if (pinInput) {
      pinInput.value = "";
      pinInput.focus();
    }
    const errText = document.getElementById("teacherLoginError");
    if (errText) errText.innerText = "";

    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  // 5. Show Teacher Workspace (ផ្ទាំងគ្រប់គ្រង Admin របស់គ្រូ)
  showTeacherWorkspace: function() {
    this.hideAllScreens();
    this.currentScreen = 'teacher-workspace';
    this.isTeacherPreviewingStudent = false;

    const el = document.getElementById("teacherWorkspaceView");
    if (el) el.style.display = "block";

    this.updateHeaderStatus("teacher");
    window.AdminEngine.loadLessonsTable();
    window.AdminEngine.refreshStats();
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  // Teacher Action: Preview Student View
  teacherPreviewStudentView: function() {
    this.isTeacherPreviewingStudent = true;
    const sampleStudent = { name: "លោកគ្រូ កែវ សំណាង (ទិដ្ឋភាពសិស្ស)" };
    window.ExamEngine.currentStudent = sampleStudent;
    this.showStudentWorkspace(sampleStudent);
  },

  // Teacher Action: Return from Student Preview back to Admin
  returnToTeacherWorkspace: function() {
    this.isTeacherPreviewingStudent = false;
    this.showTeacherWorkspace();
  },

  // Logout Actions
  logoutStudent: function() {
    sessionStorage.removeItem("teachonline_student_auth");
    window.ExamEngine.currentStudent = null;
    window.ExamEngine.resetExamAndLogin();
    this.showPortalSelector();
  },

  logoutTeacher: function() {
    sessionStorage.removeItem("teachonline_teacher_auth");
    window.AdminEngine.isLoggedIn = false;
    this.isTeacherPreviewingStudent = false;
    this.showPortalSelector();
  },

  // Update top header status indicators & action buttons
  updateHeaderStatus: function(role, extraName) {
    const statusBox = document.getElementById("headerUserStatus");
    if (!statusBox) return;

    if (role === 'guest') {
      statusBox.innerHTML = `
        <span class="user-badge"><i class="fa-solid fa-users"></i> សូមជ្រើសរើសគណនី</span>
      `;
    } else if (role === 'student') {
      statusBox.innerHTML = `
        <span class="user-badge student"><i class="fa-solid fa-graduation-cap"></i> សិស្ស៖ ${extraName || 'សិស្ស'}</span>
        <button type="button" class="header-btn logout" onclick="App.logoutStudent()">
          <i class="fa-solid fa-right-from-bracket"></i> ចាកចេញ
        </button>
      `;
    } else if (role === 'teacher') {
      statusBox.innerHTML = `
        <span class="user-badge teacher"><i class="fa-solid fa-chalkboard-user"></i> គណនីគ្រូ (Admin)</span>
        <button type="button" class="header-btn switch-role" onclick="App.teacherPreviewStudentView()">
          <i class="fa-solid fa-eye"></i> មើលផ្ទាំងសិស្ស
        </button>
        <button type="button" class="header-btn logout" onclick="App.logoutTeacher()">
          <i class="fa-solid fa-right-from-bracket"></i> ចាកចេញ
        </button>
      `;
    } else if (role === 'teacher-preview') {
      statusBox.innerHTML = `
        <span class="user-badge teacher"><i class="fa-solid fa-eye"></i> គ្រូមើលផ្ទាំងសិស្ស</span>
        <button type="button" class="header-btn switch-role" onclick="App.returnToTeacherWorkspace()">
          <i class="fa-solid fa-arrow-left"></i> ត្រឡប់ទៅផ្ទាំងគ្រូ
        </button>
      `;
    }
  }
};

window.App = App;
window.addEventListener("DOMContentLoaded", () => App.init());
