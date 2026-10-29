import { FUNCTION_URL } from './config.js';
import { ApiError } from './api.js?v=5';
import { esc, formatDate } from './format.js';

/**
 * מסך השאלון והמשימות באתר המנהל. הנתונים מ-admin-tasks (אותו אימות כמו admin-overview, ובנוסף
 * חשבון ב-feature_admins). כל טקסט שמשתמש כתב מוצג כטקסט בלבד, דרך esc, בלי HTML.
 */
const TASKS_URL = FUNCTION_URL.replace('/admin-overview', '/admin-tasks');

const AREAS = {
  persistence: 'התמדה',
  focus: 'ריכוז',
  time: 'ניהול זמן',
  motivation: 'מוטיבציה',
  habits: 'הרגלים יומיים',
  stress: 'חרדה ולחץ',
};
const REASONS = { forgot: 'שכחתי', too_hard: 'קשה מדי', no_time: 'אין זמן', not_relevant: 'לא רלוונטית' };
const STATUSES = {
  active: 'פעילות',
  passed: 'עברו',
  expired: 'פגו',
  offered: 'הוצעו',
  proposed: 'ממתינות להתאמה',
  discarded: 'בוטלו',
  hidden: 'מוסתרות',
};

async function call(token, body) {
  let response;
  try {
    response = await fetch(TASKS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0);
  }
  if (!response.ok) throw new ApiError(response.status);
  return response.json();
}

export const fetchTasksOverview = (token) => call(token, { action: 'overview' });
export const reviewTemplate = (token, templateId, decision) =>
  call(token, { action: 'review_template', templateId, decision });

function table(head, rows) {
  if (rows.length === 0) return '';
  return `<div class="table-wrap"><table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></div>`;
}

export function renderTasks(data) {
  const t = data.totals ?? { questionnaires: 0, tasks: {}, weeklyAnswers: 0 };
  const statusRows = Object.entries(t.tasks ?? {}).map(([k, v]) => [esc(STATUSES[k] ?? k), String(Number(v))]);
  const reasonRows = Object.entries(data.reasons ?? {}).map(([k, v]) => [esc(REASONS[k] ?? k), String(Number(v))]);
  const rateRows = (data.doneRate ?? []).map((r) => [esc(formatDate(r.week)), `${Number(r.percent)}%`, String(Number(r.marked))]);

  const pending = (data.pendingReview ?? [])
    .map(
      (p) => `<li class="pending"><p>${esc(p.text)}</p><p class="soft">${esc(AREAS[p.area] ?? p.area)}, קושי ${Number(p.difficulty)}</p>
      <button type="button" class="primary" data-review="${esc(p.id)}" data-decision="approve">אשר</button>
      <button type="button" data-review="${esc(p.id)}" data-decision="retire">דחה</button></li>`
    )
    .join('');

  const templates = table(
    ['תחום', 'תבנית', 'ניתנה', 'עברה', 'פגה', 'משתמשים', 'אחוז עבירה'],
    (data.templates ?? [])
      .filter((x) => x.status === 'active')
      .map((x) => [
        esc(AREAS[x.area] ?? x.area),
        esc(x.text),
        String(Number(x.timesGiven)),
        String(Number(x.passed)),
        String(Number(x.expired)),
        String(Number(x.users)),
        x.passRate === null ? 'עוד אין מספיק נתונים' : `${Number(x.passRate)}%`,
      ])
  );

  const answers = (data.questionnaires ?? [])
    .map(
      (q) => `<li><h3>${esc(q.bookTitle)}</h3>
      <p class="soft">${esc(formatDate(q.createdAt))}, ${esc(AREAS[q.area] ?? q.area)}, נתקע ${Number(q.stuckLevel)} מתוך 5</p>
      <p><strong>מה לקחת:</strong> ${esc(q.take)}</p>
      <p><strong>מה ישתנה:</strong> ${esc(q.change)}</p>
      <p><strong>מה ניסה:</strong> ${esc(q.tried)}</p></li>`
    )
    .join('');

  return `<a class="back" href="#/">חזרה</a>
  <section><h2>שאלון ומשימות</h2>
  <p>שאלונים שמולאו: <bdi>${Number(t.questionnaires)}</bdi>. תשובות לשאלה השבועית: <bdi>${Number(t.weeklyAnswers)}</bdi>.</p>
  <h3>משימות לפי מצב</h3>${table(['מצב', 'כמות'], statusRows) || '<p class="soft">אין עדיין משימות.</p>'}
  <h3>אחוז "עשיתי" לפי שבוע</h3>${table(['שבוע', 'אחוז', 'ימים שסומנו'], rateRows) || '<p class="soft">אין עדיין סימונים.</p>'}
  <h3>סיבות פקיעה</h3>${table(['סיבה', 'כמות'], reasonRows) || '<p class="soft">אין עדיין.</p>'}
  <h3>תבניות שממתינות לאישור</h3>${pending ? `<ul class="plain">${pending}</ul>` : '<p class="soft">אין תבניות שממתינות.</p>'}
  <h3>תבניות פעילות</h3>${templates || '<p class="soft">אין.</p>'}
  <h3>תשובות השאלון</h3>${answers ? `<ul class="plain">${answers}</ul>` : '<p class="soft">אין עדיין.</p>'}
  </section>`;
}
