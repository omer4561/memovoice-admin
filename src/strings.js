// כל הטקסטים שמוצגים באתר, במקום אחד. עברית בלבד.
// קיצורים בעברית עם גרש עברי (׳), לא גרש ASCII. שלוש נקודות הן סימן אחד (…).
export const strings = {
  appTitle: 'MemoVoice',
  appSub: 'ניהול',
  signInTitle: 'כניסה לבעל המוצר',
  signInBody: 'האתר הזה פתוח רק לבעל המוצר. ההתחברות היא עם חשבון Google שלך.',
  signInButton: 'התחברות עם Google',
  signOut: 'התנתקות',
  refresh: 'רענון',
  includeOwner: 'כולל החשבון שלי',
  loading: 'טוען נתונים…',
  refreshing: 'מרענן…',
  forbiddenTitle: 'אין הרשאה',
  forbiddenBody: 'החשבון הזה לא מורשה לצפות באתר הניהול. התנתק והתחבר עם החשבון של בעל המוצר.',
  errorTitle: 'לא הצלחתי לטעון את הנתונים',
  errorBody: 'בדוק שיש חיבור לאינטרנט ונסה לרענן. אם זה חוזר, העתק את הקוד ושלח אותו.',
  errorCode: (code) => `קוד: ${code}`,
  updatedAt: 'עודכן',
  back: 'חזרה לרשימה',

  testersNone: 'אין עדיין בודקים. כשיירשמו, תראה אותם כאן.',
  attentionNone: 'אף אחד לא דורש תשומת לב כרגע.',
  lede: (registered, toldToday, attentionCount) => {
    if (registered === 0) return strings.testersNone;
    const told =
      toldToday === 0 ? `אף אחד מ-${registered} הבודקים לא סיפר היום` : `${toldToday} מתוך ${registered} בודקים סיפרו היום`;
    const attention =
      attentionCount === 0
        ? 'אף אחד לא דורש תשומת לב'
        : attentionCount === 1
          ? 'אחד דורש תשומת לב'
          : `${attentionCount} דורשים תשומת לב`;
    return `${told}. ${attention}.`;
  },

  attentionTitle: 'דורשים תשומת לב',
  reasonInactive: (days) => `לא סיפר ${days} ימים`,
  reasonNeverTold: (days) => `נרשם לפני ${days} ימים ועוד לא סיפר אף פעם`,
  reasonStuck: 'תקוע בשער הבדיקה: 3 ניסיונות בלי ציון 80',
  thresholdNote: 'סימון "מאט" אחרי 2 ימים בלי הזנה, "נעלם" אחרי 4 ימים.',

  funnelTitle: 'איפה אנשים נעלמים',
  funnelStep: 'שלב',
  funnelCount: 'בודקים',
  funnelShare: 'מהנרשמים',
  funnelDropCol: 'נשירה',
  funnelRegistered: 'נרשמו',
  funnelAddedBook: 'הוסיפו ספר',
  funnelToldFirst: 'סיפרו פעם ראשונה',
  funnelPassedFirst: 'עברו בדיקה ראשונה',
  funnelDrop: (n) => (n > 0 ? `נשרו ${n}` : 'אף אחד לא נשר'),

  apiTitle: 'עומס קריאות לשרת, 30 הימים האחרונים',
  apiNone: 'אין עדיין נתוני שימוש.',
  apiCeilingLabel: (n) => `הערכת תקרה ${n}`,
  apiCeilingNote: 'התקרה היא הערכה של מכסת Gemini היומית ולא נמדדה.',
  apiCalls: 'קריאות',
  apiDate: 'תאריך',

  testersTitle: 'בודקים',
  timeNote: 'זמן ופתיחות יופיעו כאן אחרי העדכון הבא של האפליקציה.',
  colTester: 'בודק',
  colStatus: 'מצב',
  colLastEntry: 'הזנה אחרונה',
  colSince: 'לפני',
  colStreak: 'רצף',
  colBooks: 'ספרים',
  colCheck: 'בדיקת אתמול',
  colTime: 'זמן באפליקציה',
  noEmail: 'ללא מייל',
  ownerTag: 'החשבון שלי',
  neverTold: 'לא סיפר עדיין',
  today: 'היום',
  yesterday: 'אתמול',
  daysAgo: (n) => `לפני ${n} ימים`,
  streakDays: (n) => `${n} ימים`,
  pages: (from, to) => `עמ׳ ${from} עד ${to}`,
  booksCell: (started, finished) => `${started} קורא, ${finished} סיים`,
  checkNone: 'לא נבדק',
  checkCell: (score, attempts) => `${score === null ? 'ללא ציון' : score} · ניסיונות ${attempts}`,
  timeCell: (minutes, opens) => `${minutes} דק׳ · ${opens} פתיחות`,

  status: {
    green: 'פעיל',
    orange: 'מאט',
    red: 'נעלם',
    never: 'עוד לא סיפר',
  },

  detailHistory: 'היסטוריית הזנות',
  detailHistoryNone: 'אין עדיין הזנות.',
  detailLastEntry: 'ההזנה האחרונה',
  detailSaid: 'מה שהבודק אמר',
  detailNoText: 'אין טקסט להזנה הזו.',
  colDate: 'תאריך',
  colBook: 'ספר',
  colPages: 'עמודים',
};
