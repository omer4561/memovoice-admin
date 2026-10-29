import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderTasks } from '../src/tasks.js';

const base = {
  totals: { questionnaires: 2, tasks: { active: 3, passed: 1 }, weeklyAnswers: 1 },
  reasons: { forgot: 2 },
  doneRate: [{ week: '2026-10-25', percent: 60, marked: 5 }],
  templates: [],
  pendingReview: [],
  questionnaires: [],
};

test('מציג מצבים וסיבות בעברית', () => {
  const html = renderTasks(base);
  assert.match(html, /פעילות/);
  assert.match(html, /שכחתי/);
  assert.match(html, /60%/);
});

test('טקסט משתמש מוצג כטקסט ולא כ-HTML', () => {
  const html = renderTasks({
    ...base,
    questionnaires: [
      { bookTitle: '<img src=x onerror=alert(1)>', area: 'focus', stuckLevel: 3, take: '<script>x</script>', change: 'a', tried: 'b', createdAt: '2026-10-29T08:00:00Z' },
    ],
    pendingReview: [{ id: 'abc', text: '<b>תבנית</b>', area: 'time', difficulty: 2 }],
  });
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<b>תבנית'));
  assert.match(html, /&lt;script&gt;/);
});

test('תבנית ממתינה מקבלת כפתורי אישור ודחייה', () => {
  const html = renderTasks({ ...base, pendingReview: [{ id: 'id-1', text: 'תבנית חדשה כאן', area: 'time', difficulty: 1 }] });
  assert.match(html, /data-decision="approve"/);
  assert.match(html, /data-decision="retire"/);
});

test('בלי נתונים מציג הודעות ריקות ולא קורס', () => {
  const html = renderTasks({});
  assert.match(html, /אין עדיין משימות/);
});
