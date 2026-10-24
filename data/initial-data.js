/**
 * Initial Default Data for TeachOnline
 * Loaded when local storage or Supabase is empty
 */

const INITIAL_DATA = {
  settings: {
    teacherPin: "123456",
    supabaseUrl: "",
    supabaseAnonKey: "",
    googleSheetUrl: "",
    telegramBotToken: "8904689851:AAG62KOgG15fc89-6RRHVgLsuqL-HOSyQQI",
    telegramChatId: "-1004369015499",
    geminiApiKey: ""
  },

  students: [
    { id: 1, name: "កែវ សំណាង", password: "1234", phone: "012345678" },
    { id: 2, name: "សិស្ស គំរូ", password: "1234", phone: "098765432" },
    { id: 3, name: "សុខ វិសាល", password: "1234", phone: "088123456" },
    { id: 4, name: "ចាន់ ដារ៉ា", password: "1234", phone: "077889900" }
  ],

  lessons: [
    {
      id: 1,
      lesson_name: "Lesson 1: Present Simple Tense",
      level: "Level 1",
      title: "មេរៀនទី ១ ៖ បច្ចុប្បន្នកាលធម្មតា (Present Simple Tense)",
      duration_minutes: 45,
      video_link1: "https://www.youtube.com/watch?v=L9AWrJnhsRI",
      video_link2: "https://www.youtube.com/shorts/36V_85zY8_g",
      objectives: "- យល់ច្បាស់អំពីរចនាសម្ព័ន្ធ Present Simple Tense\n- ចេះប្រើប្រាស់ជាមួយកិរិយាស័ព្ទ (Verb) ធម្មតា និងកិរិយាស័ព្ទ to be\n- ចេះបង្កើតប្រយោគស្រប បដិសេធ និងសំណួរ",
      content: "### ១. រចនាសម្ព័ន្ធមូលដ្ឋាន (Structure)\n\nPresent Simple Tense ប្រើសម្រាប់និយាយអំពី៖\n1. **ការពិតទូទៅ (General Truths)**: The sun rises in the east.\n2. **ទម្លាប់ប្រចាំថ្ងៃ (Daily Habits/Routines)**: I wake up at 6 AM every day.\n3. **ស្ថានភាពអចិន្ត្រៃយ៍ (Permanent Situations)**: She lives in Phnom Penh.\n\n#### រូបមន្ត (Formulas):\n- **Positive (+):** `Subject + Verb(s/es) + Object`\n- **Negative (-):** `Subject + do/does + not + Verb(base) + Object`\n- **Question (?):** `Do/Does + Subject + Verb(base) + Object?`",
      formula_summary: "- I / You / We / They + **V(base)** (ឧទាហរណ៍: *I play, They work*)\n- He / She / It + **V(s/es)** (ឧទាហរណ៍: *He plays, She watches*)",
      examples: "1. **(+)** She **speaks** English fluently.\n2. **(-)** They **do not like** spicy food.\n3. **(?)** **Do** you study every evening?",
      notes: "- កិរិយាស័ព្ទបញ្ចប់ដោយ **-ch, -sh, -ss, -x, -o** ត្រូវថែម **-es** (watch -> watches, go -> goes)\n- កិរិយាស័ព្ទបញ្ចប់ដោយ ព្យញ្ជនៈ + y ត្រូវប្តូរ y ជា **-ies** (study -> studies)",
      common_errors: "❌ *He study English every day.* (ខុស)\n✅ *He studies English every day.* (ត្រូវ)\n❌ *She doesn't likes coffee.* (ខុស ព្រោះមាន doesn't ហើយ Verb ត្រូវនៅ base form)\n✅ *She doesn't like coffee.* (ត្រូវ)"
    },
    {
      id: 2,
      lesson_name: "Lesson 2: Past Simple Tense",
      level: "Level 1",
      title: "មេរៀនទី ២ ៖ អតីតកាលធម្មតា (Past Simple Tense)",
      duration_minutes: 60,
      video_link1: "https://www.youtube.com/watch?v=0b4RsHg4-6Y",
      video_link2: "https://www.youtube.com/watch?v=xL9c4U5Q9F8",
      objectives: "- ចេះប្រើ Regular & Irregular verbs ក្នុង Past Simple\n- ចេះសរសេរប្រយោគរៀបរាប់អំពីព្រឹត្តិការណ៍ក្នុងអតីតកាល",
      content: "### ១. ការប្រើប្រាស់ Past Simple\n\nPast Simple Tense ប្រើសម្រាប់សកម្មភាពដែលបានកើតឡើង និងបានបញ្ចប់ទាំងស្រុងក្នុងអតីតកាល ដោយមានពេលវេលាជាក់លាក់ (yesterday, last week, 2 years ago, in 2020)។",
      formula_summary: "- **(+)** `S + V2 (ed / irregular) + O`\n- **(-)** `S + did not (didn't) + V(base) + O`\n- **(?)** `Did + S + V(base) + O?`",
      examples: "- I **visited** Siem Reap last month.\n- We **didn't go** to school yesterday.\n- **Did** you see that movie?",
      notes: "សូមចំណាំថា នៅពេលប្រើ Did ឬ Didn't រួចហើយ កិរិយាស័ព្ទបន្ទាប់ត្រូវត្រឡប់មកទម្រង់ដើម (Base form) វិញជានិច្ច។",
      common_errors: "❌ *Did you went to school?*\n✅ *Did you go to school?*"
    }
  ],

  questions: [
    // --- LESSON 1 QUESTIONS ---
    {
      id: 101,
      lesson: "Lesson 1: Present Simple Tense",
      level: "Level 1",
      type: "MCQ_TEXT",
      category: "Grammar Rules",
      questionTitle: "Choose the correct verb form",
      questionText: "She _______ to music every morning.",
      language: "en-US",
      options: "listen|listens|listening|listened",
      correctAnswer: "listens",
      points: 1,
      speechText: "She listens to music every morning."
    },
    {
      id: 102,
      lesson: "Lesson 1: Present Simple Tense",
      level: "Level 1",
      type: "TRUE_FALSE",
      category: "Grammar Check",
      questionTitle: "Check sentence validity",
      questionText: "Sentence: 'They doesn't like cold weather.'",
      language: "en-US",
      options: "TRUE|FALSE",
      correctAnswer: "FALSE",
      points: 1,
      speechText: "They does not like cold weather."
    },
    {
      id: 103,
      lesson: "Lesson 1: Present Simple Tense",
      level: "Level 1",
      type: "FILL",
      category: "Fill in the Blanks",
      questionTitle: "Complete the sentence with correct verb",
      questionText: "Water {{input1}} at 100 degrees Celsius and ice {{input2}} at 0 degrees.",
      language: "en-US",
      correctAnswer: "boils|melts",
      points: 2,
      speechText: "Water boils at 100 degrees Celsius and ice melts at 0 degrees."
    },
    {
      id: 104,
      lesson: "Lesson 1: Present Simple Tense",
      level: "Level 1",
      type: "MATCHING",
      category: "Vocabulary Matching",
      questionTitle: "Match English words to Khmer meanings",
      questionText: "ផ្គូផ្គងពាក្យអង់គ្លេសទៅនឹងអត្ថន័យជាភាសាខ្មែរ",
      language: "en-US",
      dataExtra: JSON.stringify({
        left: ["Always", "Never", "Sometimes", "Usually"],
        right: ["ជានិច្ច", "មិនដែល", "ជួនកាល", "ជាធម្មតា"]
      }),
      correctAnswer: JSON.stringify({ "0": 0, "1": 1, "2": 2, "3": 3 }),
      points: 4
    },
    {
      id: 105,
      lesson: "Lesson 1: Present Simple Tense",
      level: "Level 1",
      type: "DRAG_DROP",
      category: "Sentence Arrangement",
      questionTitle: "Arrange words in correct order",
      questionText: "រៀបចំបង្កើតជាប្រយោគស្រប Present Simple ត្រឹមត្រូវ",
      language: "en-US",
      correctAnswer: "He plays football every Sunday",
      options: "football|plays|every|He|Sunday",
      points: 2
    },
    {
      id: 106,
      lesson: "Lesson 1: Present Simple Tense",
      level: "Level 1",
      type: "LISTEN_WRITE",
      category: "Listening Test",
      questionTitle: "Listen carefully and write what you hear",
      questionText: "ស្តាប់ការបញ្ចេញសំឡេង រួចសរសេរពាក្យ ឬឃ្លានោះចូលប្រអប់",
      language: "en-US",
      speechText: "The sun rises in the east.",
      correctAnswer: "The sun rises in the east.|The sun rises in the east",
      points: 2
    },
    {
      id: 107,
      lesson: "Lesson 1: Present Simple Tense",
      level: "Level 1",
      type: "SHORT_ANSWER",
      category: "Writing Skill",
      questionTitle: "Make a question sentence",
      questionText: "Change this positive statement into a question: 'You live in Cambodia.'",
      language: "en-US",
      correctAnswer: "Do you live in Cambodia?|Do you live in Cambodia",
      points: 2
    },
    {
      id: 108,
      lesson: "Lesson 1: Present Simple Tense",
      level: "Level 1",
      type: "MCQ_IMAGE",
      category: "Visual Identification",
      questionTitle: "Look at the image and select the action",
      questionText: "What does this icon represent?",
      mediaUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&auto=format&fit=crop&q=80",
      options: "Education and Study|Cooking Food|Playing Sports|Driving Car",
      correctAnswer: "Education and Study",
      points: 1
    },

    // --- LESSON 2 QUESTIONS ---
    {
      id: 201,
      lesson: "Lesson 2: Past Simple Tense",
      level: "Level 1",
      type: "MCQ_TEXT",
      category: "Irregular Verbs",
      questionTitle: "Past form of 'go'",
      questionText: "Yesterday, my brother _______ to the market.",
      language: "en-US",
      options: "go|goes|went|gone",
      correctAnswer: "went",
      points: 1
    },
    {
      id: 202,
      lesson: "Lesson 2: Past Simple Tense",
      level: "Level 1",
      type: "FILL",
      category: "Fill in the Blanks",
      questionTitle: "Negative past form",
      questionText: "I {{input1}} see him yesterday because I was busy.",
      language: "en-US",
      correctAnswer: "didn't||did not",
      points: 1
    },
    {
      id: 203,
      lesson: "Lesson 2: Past Simple Tense",
      level: "Level 1",
      type: "MATCHING",
      category: "Verb 1 and Verb 2",
      questionTitle: "Match Base verbs to Past verbs",
      language: "en-US",
      dataExtra: JSON.stringify({
        left: ["Eat", "See", "Write", "Buy"],
        right: ["Ate", "Saw", "Wrote", "Bought"]
      }),
      correctAnswer: JSON.stringify({ "0": 0, "1": 1, "2": 2, "3": 3 }),
      points: 4
    }
  ],

  results: []
};

window.INITIAL_DATA = INITIAL_DATA;
