/**
 * TeachOnline - Google Apps Script Backend & Sync Hub
 * Connects Google Sheet, Telegram Notifications, and Web App
 */

const CONFIG = {
  PRIMARY_SHEET_ID: SpreadsheetApp.getActiveSpreadsheet() ? SpreadsheetApp.getActiveSpreadsheet().getId() : "",
  STUDENTS_SHEET: "Students",
  QUESTIONS_SHEET: "Questions",
  LESSONS_SHEET: "Lessons",
  TIMES_SHEET: "Times",
  RESULTS_SHEET: "Results",
  
  TELEGRAM_BOT_TOKEN: "8904689851:AAG62KOgG15fc89-6RRHVgLsuqL-HOSyQQI",
  TELEGRAM_CHAT_ID: "-1004369015499"
};

function doGet(e) {
  // Can serve as an API or return status
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";
  
  if (action === "getInitialData") {
    const data = {
      students: getStudentList(),
      lessons: getLessons()
    };
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    message: "TeachOnline Google Sheet API is ready!"
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    let data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter;
    }
    
    // Save exam result to Google Sheet
    const result = saveResult(data);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Result saved to Google Sheet successfully",
      details: result
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getSpreadsheet() {
  if (CONFIG.PRIMARY_SHEET_ID) {
    return SpreadsheetApp.openById(CONFIG.PRIMARY_SHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getStudentList() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.STUDENTS_SHEET);
    if (!sheet) return [];
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    
    const values = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
    const students = values.flat().map(v => String(v).trim()).filter(v => v !== "");
    return [...new Set(students)].sort();
  } catch (e) {
    return [];
  }
}

function getLessons() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.QUESTIONS_SHEET);
    if (!sheet) return [];
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];

    const values = sheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues(); 
    const lessons = values.flat().map(v => String(v).trim()).filter(v => v !== "");
    return [...new Set(lessons)].sort();
  } catch (e) {
    return [];
  }
}

function saveResult(result) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.RESULTS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.RESULTS_SHEET);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Date", "Time", "Lesson", "Level", "Student", "Score", "Total", "Percent"]);
  }

  const now = new Date();
  const timezone = Session.getScriptTimeZone() || "Asia/Phnom_Penh";
  const date = Utilities.formatDate(now, timezone, "dd/MM/yyyy");
  const time = Utilities.formatDate(now, timezone, "HH:mm:ss");

  const lesson = String(result.lesson || "").trim();
  const level = String(result.level || "").trim();
  const student = String(result.studentName || result.student || "").trim();
  const score = Number(result.score) || 0;
  const total = Number(result.total || result.total_points) || 0;
  const percent = Number(result.percentage || result.percent) || (total > 0 ? Math.round((score/total)*100) : 0);

  sheet.appendRow([date, time, lesson, level, student, score, total, percent]);

  // Telegram Notification
  const tgMessage = `📝 <b>មានសិស្សប្រឡងរួចរាល់ TeachOnline</b>\n\n` +
                    `👤 <b>ឈ្មោះសិស្ស:</b> ${student}\n` +
                    `📚 <b>មេរៀន:</b> ${lesson} (Level: ${level})\n` +
                    `🎯 <b>ពិន្ទុទទួលបាន:</b> ${score}/${total} (<b>${percent}%</b>)\n` +
                    `🕒 <b>ពេលវេលា:</b> ${date} ${time}`;
  
  sendToTelegram(tgMessage);
  return { success: true, date: date, time: time, student: student, score: score, percent: percent };
}

function sendToTelegram(message) {
  if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) return;
  const url = "https://api.telegram.org/bot" + CONFIG.TELEGRAM_BOT_TOKEN + "/sendMessage";
  const payload = {
    chat_id: CONFIG.TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: "HTML"
  };
  
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    Logger.log("Telegram Error: " + e.message);
  }
}
