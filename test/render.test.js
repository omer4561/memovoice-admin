import test from 'node:test';
import assert from 'node:assert/strict';
import { esc } from '../src/format.js';
import { renderOverview, renderTesterDetail } from '../src/render.js';
import { strings } from '../src/strings.js';

function overview(overrides = {}) {
  return {
    generatedAt: '2026-10-16T09:00:00Z',
    today: '2026-10-16',
    totals: { registered: 2, toldToday: 1, inactive3Plus: 1 },
    funnel: { registered: 2, addedBook: 1, toldFirstTime: 1, passedFirstCheck: 0 },
    attention: [],
    testers: [],
    apiUsage: [],
    apiEstimatedDailyCeiling: 250,
    timeTracking: { available: false },
    ...overrides,
  };
}

function tester(overrides = {}) {
  return {
    userId: '11111111-1111-1111-1111-111111111111',
    email: 'one@example.com',
    registeredAt: '2026-10-02T08:00:00Z',
    lastEntryDate: '2026-10-15',
    lastEntryBook: 'ספר',
    lastEntryPages: { from: 20, to: 31 },
    daysSince: 1,
    streak: 3,
    booksStarted: 2,
    booksFinished: 1,
    status: 'green',
    latestCheck: { score: 92, attempts: 1, date: '2026-10-16' },
    isOwner: false,
    ...overrides,
  };
}

test('renderOverview shows a tester row with Israeli dates and the key numbers', () => {
  const html = renderOverview(overview({ testers: [tester()] }), strings);
  assert.ok(html.includes('one@example.com'));
  assert.ok(html.includes('15/10/2026'));
  assert.ok(html.includes(esc(strings.pages(20, 31))));
  assert.ok(html.includes('data-user-id="11111111-1111-1111-1111-111111111111"'));
});

test('renderOverview does not crash on a tester with no email and shows a fallback', () => {
  const html = renderOverview(overview({ testers: [tester({ email: null })] }), strings);
  assert.ok(html.includes(strings.noEmail));
});

test('renderOverview shows an empty state when there are no testers', () => {
  const html = renderOverview(overview(), strings);
  assert.ok(html.includes(strings.testersNone));
});

test('renderOverview marks the time column as pending until time tracking ships', () => {
  const html = renderOverview(overview({ testers: [tester()] }), strings);
  assert.ok(html.includes(strings.afterNextUpdate));
});

test('renderOverview shows time and opens once time tracking is available', () => {
  const html = renderOverview(
    overview({ timeTracking: { available: true }, testers: [tester({ activeMinutes7d: 42, opens7d: 9 })] }),
    strings
  );
  assert.ok(html.includes(esc(strings.timeCell(42, 9))));
  assert.ok(!html.includes(strings.afterNextUpdate));
});

test('renderOverview explains each attention reason', () => {
  const html = renderOverview(
    overview({
      attention: [
        { userId: 'a', email: 'a@example.com', reason: 'inactive', days: 5 },
        { userId: 'b', email: null, reason: 'never_told', days: 6 },
        { userId: 'c', email: 'c@example.com', reason: 'stuck_at_gate', days: null },
      ],
    }),
    strings
  );
  assert.ok(html.includes(strings.reasonInactive(5)));
  assert.ok(html.includes(strings.reasonNeverTold(6)));
  assert.ok(html.includes(strings.reasonStuck));
});

test('renderOverview escapes hostile values in emails and book titles', () => {
  const hostile = '<script>alert(1)</script>';
  const html = renderOverview(
    overview({
      attention: [{ userId: 'a', email: hostile, reason: 'inactive', days: 5 }],
      testers: [tester({ email: hostile, lastEntryBook: hostile })],
    }),
    strings
  );
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('renderTesterDetail escapes what the tester said, their email and book titles', () => {
  const hostile = '<script>alert(1)</script><img src=x onerror=alert(2)>';
  const html = renderTesterDetail(
    {
      userId: 'u',
      email: hostile,
      history: [{ date: '2026-10-15', bookTitle: hostile, pageFrom: 1, pageTo: 5 }],
      lastEntry: { entryId: 'e', date: '2026-10-15', bookTitle: hostile, pageFrom: 1, pageTo: 5, text: hostile },
    },
    strings
  );
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('renderTesterDetail shows the history dates and the last entry text', () => {
  const html = renderTesterDetail(
    {
      userId: 'u',
      email: 'one@example.com',
      history: [
        { date: '2026-10-15', bookTitle: 'ספר', pageFrom: 20, pageTo: 31 },
        { date: '2026-10-14', bookTitle: 'ספר', pageFrom: 1, pageTo: 19 },
      ],
      lastEntry: { entryId: 'e', date: '2026-10-15', bookTitle: 'ספר', pageFrom: 20, pageTo: 31, text: 'סיפרתי על הפרק' },
    },
    strings
  );
  assert.ok(html.includes('15/10/2026'));
  assert.ok(html.includes('14/10/2026'));
  assert.ok(html.includes('סיפרתי על הפרק'));
});

test('renderTesterDetail copes with a tester who has no entries', () => {
  const html = renderTesterDetail({ userId: 'u', email: null, history: [], lastEntry: null }, strings);
  assert.ok(html.includes(strings.detailHistoryNone));
  assert.ok(html.includes(strings.noEmail));
});
