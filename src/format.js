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

const DAY_MS = 86_400_000;

function keyToUtc(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** תאריך ישראלי (YYYY-MM-DD) לחותמת זמן. Intl ולא הפרש שעות קבוע, כי הקיץ והחורף שונים. */
export function israelDateKey(iso) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

export function israelTodayKey() {
  return israelDateKey(new Date().toISOString());
}

/** ימים שלמים בין שני מפתחות תאריך, לא שלילי. חישוב ב-UTC, כדי שמעבר שעון לא יזיז יום. */
export function dayDiff(fromKey, toKey) {
  const diff = Math.round((keyToUtc(toKey) - keyToUtc(fromKey)) / DAY_MS);
  return Number.isFinite(diff) ? Math.max(0, diff) : 0;
}

export function addDays(key, delta) {
  const d = new Date(keyToUtc(key) + delta * DAY_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** ראשי תיבות לעיגול הדמות: האותיות הראשונות של שם המייל. */
export function initials(email) {
  const name = String(email ?? '').split('@')[0];
  const parts = name.split(/[^\p{L}]+/u).filter(Boolean);
  if (parts.length === 0) return '?';
  const letters = parts.length >= 2 ? [parts[0], parts[1]].map((p) => Array.from(p)[0]).join('') : Array.from(parts[0]).slice(0, 2).join('');
  return letters.toLocaleUpperCase('en');
}
