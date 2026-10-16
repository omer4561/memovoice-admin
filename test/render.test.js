import test from 'node:test';
import assert from 'node:assert/strict';
import { esc } from '../src/format.js';
import { renderOverview, renderTesterDetail } from '../src/render.js';
import { strings } from '../src/strings.js';

const ID = '11111111-1111-1111-1111-111111111111';

function overview(overrides = {}) {
  return {
    generatedAt: '2026-10-16T09:00:00Z',
    today: '2026-10-16',
    totals: { registered: 12, toldToday: 5, inactive3Plus: 1 },
    funnel: { registered: 12, addedBook: 10, toldFirstTime: 8, passedFirstCheck: 5 },
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
    userId: ID,
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

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

test('a tester row links to the tester route, so back and share work', () => {
  const html = renderOverview(overview({ testers: [tester()] }), strings);
  assert.ok(html.includes(`href="#/tester/${ID}"`));
  assert.ok(html.includes('one@example.com'));
});

test('a row shows the Israeli date, the pages with a Hebrew geresh and the status as a word', () => {
  const html = renderOverview(overview({ testers: [tester()] }), strings);
  assert.ok(html.includes('15/10/2026'));
  assert.ok(html.includes(esc(strings.pages(20, 31))));
  assert.ok(html.includes(strings.status.green));
});

test('every status is a visible word, not only a colour', () => {
  for (const status of ['green', 'orange', 'red', 'never']) {
    const html = renderOverview(overview({ testers: [tester({ status })] }), strings);
    assert.ok(html.includes(`class="status s-${status}"`), status);
    assert.ok(html.includes(esc(strings.status[status])), status);
  }
});

test('the status marker is decorative for screen readers', () => {
  const html = renderOverview(overview({ testers: [tester()] }), strings);
  assert.ok(html.includes('<i aria-hidden="true"></i>'));
});

test('a tester with no email shows a fallback and does not crash', () => {
  const html = renderOverview(overview({ testers: [tester({ email: null })] }), strings);
  assert.ok(html.includes(strings.noEmail));
});

test('no testers: the lede says so and there is no table', () => {
  const html = renderOverview(overview({ totals: { registered: 0, toldToday: 0, inactive3Plus: 0 } }), strings);
  assert.ok(html.includes(strings.testersNone));
  assert.ok(!html.includes('role="table"'));
});

test('the testers list is a real table for assistive tech, with labelled cells for the phone layout', () => {
  const html = renderOverview(overview({ testers: [tester()] }), strings);
  assert.ok(html.includes('role="table"'));
  assert.ok(html.includes('role="columnheader"'));
  assert.ok(html.includes(`data-label="${esc(strings.colLastEntry)}"`));
});

test('the pending time column is one note, not a placeholder on every row', () => {
  const html = renderOverview(overview({ testers: [tester(), tester({ userId: 'b' }), tester({ userId: 'c' })] }), strings);
  assert.equal(count(html, strings.timeNote), 1);
  assert.ok(!html.includes(strings.colTime));
  assert.ok(!html.includes('afterNextUpdate'));
});

test('once time tracking is available the column and the values appear', () => {
  const html = renderOverview(
    overview({ timeTracking: { available: true }, testers: [tester({ activeMinutes7d: 42, opens7d: 9 })] }),
    strings
  );
  assert.ok(html.includes(esc(strings.timeCell(42, 9))));
  assert.ok(html.includes(strings.colTime));
  assert.ok(!html.includes(strings.timeNote));
});

test('the lede counts distinct testers who need attention, not attention items', () => {
  const html = renderOverview(
    overview({
      attention: [
        { userId: 'a', email: 'a@example.com', reason: 'inactive', days: 5 },
        { userId: 'a', email: 'a@example.com', reason: 'stuck_at_gate', days: null },
        { userId: 'b', email: null, reason: 'never_told', days: 6 },
      ],
    }),
    strings
  );
  assert.ok(html.includes('5 מתוך 12'));
  assert.ok(html.includes('2 דורשים תשומת לב'));
});

test('the lede handles nobody told today and nobody needing attention', () => {
  const html = renderOverview(overview({ totals: { registered: 12, toldToday: 0, inactive3Plus: 0 } }), strings);
  assert.ok(html.includes('אף אחד'));
  assert.ok(html.includes(strings.attentionNone));
});

test('each attention reason is explained in words', () => {
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
  assert.ok(html.includes(esc(strings.reasonInactive(5))));
  assert.ok(html.includes(esc(strings.reasonNeverTold(6))));
  assert.ok(html.includes(esc(strings.reasonStuck)));
  assert.ok(html.includes(esc(strings.thresholdNote)));
});

test('the funnel shows share of registered and the drop from the previous step', () => {
  const html = renderOverview(overview(), strings);
  for (const expected of ['100%', '83%', '67%', '42%', 'נשרו 2', 'נשרו 3']) {
    assert.ok(html.includes(expected), expected);
  }
});

test('a funnel with nobody registered has no NaN or Infinity', () => {
  const html = renderOverview(
    overview({
      totals: { registered: 0, toldToday: 0, inactive3Plus: 0 },
      funnel: { registered: 0, addedBook: 0, toldFirstTime: 0, passedFirstCheck: 0 },
    }),
    strings
  );
  assert.ok(!html.includes('NaN'));
  assert.ok(!html.includes('Infinity'));
});

test('the chart prints its numbers on the chart and has a table for screen readers', () => {
  const html = renderOverview(
    overview({
      apiUsage: [
        { date: '2026-10-15', calls: 40 },
        { date: '2026-10-16', calls: 180 },
      ],
    }),
    strings
  );
  assert.ok(html.includes('class="chart"'));
  assert.ok(html.includes('>180<'));
  assert.ok(html.includes(esc(strings.apiCeilingLabel(250))));
  assert.ok(html.includes('class="sr-only"'));
  assert.ok(html.includes('15/10/2026'));
  assert.ok(html.includes('16/10/2026'));
});

test('hostile values in emails and book titles are escaped everywhere in the overview', () => {
  const hostile = '<script>alert(1)</script>';
  const html = renderOverview(
    overview({
      attention: [{ userId: ID, email: hostile, reason: 'inactive', days: 5 }],
      testers: [tester({ email: hostile, lastEntryBook: hostile })],
    }),
    strings
  );
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('a tester id that is not a uuid never reaches an attribute unescaped', () => {
  const html = renderOverview(overview({ testers: [tester({ userId: '"><img src=x onerror=alert(1)>' })] }), strings);
  assert.ok(!html.includes('<img'));
});

test('detail: back link, the last entry on the notebook page, and the history', () => {
  const html = renderTesterDetail(
    {
      userId: ID,
      email: 'one@example.com',
      history: [
        { date: '2026-10-15', bookTitle: 'ספר', pageFrom: 20, pageTo: 31 },
        { date: '2026-10-14', bookTitle: 'ספר', pageFrom: 1, pageTo: 19 },
      ],
      lastEntry: { entryId: 'e', date: '2026-10-15', bookTitle: 'ספר', pageFrom: 20, pageTo: 31, text: 'סיפרתי על הפרק' },
    },
    strings
  );
  assert.ok(html.includes('href="#/"'));
  assert.ok(html.includes('class="said"'));
  assert.ok(html.includes('dir="auto"'));
  assert.ok(html.includes('סיפרתי על הפרק'));
  assert.ok(html.includes('15/10/2026'));
  assert.ok(html.includes('14/10/2026'));
});

test('detail escapes what the tester said, their email and book titles', () => {
  const hostile = '<script>alert(1)</script><img src=x onerror=alert(2)>';
  const html = renderTesterDetail(
    {
      userId: ID,
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

test('detail copes with a tester who has no entries and no email', () => {
  const html = renderTesterDetail({ userId: ID, email: null, history: [], lastEntry: null }, strings);
  assert.ok(html.includes(strings.detailHistoryNone));
  assert.ok(html.includes(strings.noEmail));
});
