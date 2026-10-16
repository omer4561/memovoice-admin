// תאריכים ושעות בפורמט ישראלי: יום/חודש/שנה, שעון 24 שעות, אזור זמן ישראל.
const KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

const israelParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jerusalem',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function partsOf(iso) {
  const parts = {};
  for (const p of israelParts.formatToParts(new Date(iso))) parts[p.type] = p.value;
  return parts;
}

/** מפתח תאריך (YYYY-MM-DD) מוצג כמו שהוא, בלי הזזת אזור זמן. חותמת זמן מוצגת לפי שעון ישראל. */
export function formatDate(value) {
  const key = KEY.exec(value);
  if (key) return `${key[3]}/${key[2]}/${key[1]}`;
  const p = partsOf(value);
  return `${p.day}/${p.month}/${p.year}`;
}

export function formatDateTime(iso) {
  const p = partsOf(iso);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

/** בריחת HTML. כל ערך שמגיע מהשרת ומוצג ב-innerHTML עובר דרך הפונקציה הזו. */
export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
