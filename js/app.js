/**
 * TeachOnline - Main App Controller
 * Coordinates Views, Modals, and Portal Navigation
 */

const App = {
  currentView: 'student', // 'student' or 'teacher'

  init: function() {
    console.log("TeachOnline Application Initializing...");
    window.TeachData.init();
    window.ExamEngine.init();
    
    this.setupViewControls();
    this.setupGlobalModalClosers();
  },

  setupViewControls: function() {
    const btnSwitchTeacher = document.getElementById("btnSwitchTeacher");
    const btnSwitchStudent = document.getElementById("btnSwitchStudent");

    if (btnSwitchTeacher) {
      btnSwitchTeacher.addEventListener("click", () => {
        this.switchToTeacherView();
      });
    }

    if (btnSwitchStudent) {
      btnSwitchStudent.addEventListener("click", () => {
        this.switchToStudentView();
      });
    }
  },

  switchToTeacherView: function() {
    if (window.AdminEngine.isLoggedIn) {
      document.getElementById("studentView").style.display = "none";
      document.getElementById("teacherView").style.display = "block";
      this.currentView = 'teacher';
      window.AdminEngine.showDashboard();
    } else {
      window.AdminEngine.showLoginModal();
    }
  },

  switchToStudentView: function() {
    document.getElementById("teacherView").style.display = "none";
    document.getElementById("studentView").style.display = "block";
    this.currentView = 'student';
    window.ExamEngine.populateStudentDropdown();
    window.ExamEngine.populateLessonDropdown();
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  setupGlobalModalClosers: function() {
    window.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal-backdrop")) {
        e.target.style.display = "none";
      }
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        document.querySelectorAll(".modal-backdrop").forEach(m => m.style.display = "none");
      }
    });
  }
};

window.App = App;
window.addEventListener("DOMContentLoaded", () => App.init());
