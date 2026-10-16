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
    activeDays: ['2026-10-15', '2026-10-14', '2026-10-10'],
    booksStarted: 2,
    booksFinished: 1,
    status: 'green',
    latestCheck: { score: 92, attempts: 1, date: '2026-10-16' },
    isOwner: false,
    ...overrides,
  };
}

function neverTold(id, email, registeredAt = '2026-10-10T08:00:00Z') {
  return tester({
    userId: id,
    email,
    registeredAt,
    lastEntryDate: null,
    lastEntryBook: null,
    lastEntryPages: null,
    daysSince: null,
    streak: 0,
    activeDays: [],
    booksStarted: 0,
    booksFinished: 0,
    status: 'never',
    latestCheck: null,
  });
}

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function kpi(html, name) {
  const match = new RegExp(`data-kpi="${name}"[\\s\\S]*?kpi-num">(\\d+)<`).exec(html);
  return match ? Number(match[1]) : null;
}

test('the four tiles: told today of registered, active in 7 days, not started, passed the first check', () => {
  const html = renderOverview(
    overview({
      testers: [tester({ userId: 'a' }), tester({ userId: 'b', activeDays: ['2026-10-12'] }), tester({ userId: 'c', activeDays: ['2026-10-01'] }), neverTold('d', 'd@example.com')],
    }),
    strings
  );
  assert.equal(kpi(html, 'told'), 5);
  assert.ok(html.includes('מתוך 12'));
  assert.ok(html.includes(strings.kpiToldToday));
  assert.equal(kpi(html, 'active7'), 2);
  assert.equal(kpi(html, 'notstarted'), 1);
  assert.equal(kpi(html, 'passed'), 5);
});

test('only testers who told at least once get a card, the rest are one compact group', () => {
  const html = renderOverview(
    overview({ testers: [tester(), neverTold('b', 'b@example.com'), neverTold('c', 'c@example.com'), neverTold('d', 'd@example.com')] }),
    strings
  );
  assert.equal(count(html, '<article class="tcard'), 1);
  assert.equal(count(html, 'class="chip-link"'), 3);
  assert.ok(html.includes(esc(strings.notStartedTitle)));
});

test('the group says how long the oldest registration has been waiting', () => {
  const html = renderOverview(
    overview({ testers: [neverTold('b', 'b@example.com', '2026-10-13T08:00:00Z'), neverTold('c', 'c@example.com', '2026-10-10T08:00:00Z')] }),
    strings
  );
  assert.ok(html.includes(esc(strings.notStartedNote(6))));
});

test('cards are ordered by need: stuck, gone, slowing, active', () => {
  const html = renderOverview(
    overview({
      testers: [
        tester({ userId: '00000000-0000-0000-0000-00000000000a', email: 'active@example.com', status: 'green' }),
        tester({ userId: '00000000-0000-0000-0000-00000000000b', email: 'slow@example.com', status: 'orange' }),
        tester({ userId: '00000000-0000-0000-0000-00000000000c', email: 'gone@example.com', status: 'red' }),
        tester({ userId: '00000000-0000-0000-0000-00000000000d', email: 'stuck@example.com', status: 'green', latestCheck: { score: 60, attempts: 3, date: '2026-10-16' } }),
      ],
    }),
    strings
  );
  const order = ['stuck@', 'gone@', 'slow@', 'active@'].map((name) => html.indexOf(name));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  assert.ok(order.every((i) => i > 0));
});

test('a card links to the tester route and shows status as a word, date, pages with geresh, streak and books', () => {
  const html = renderOverview(overview({ testers: [tester()] }), strings);
  assert.ok(html.includes(`href="#/tester/${ID}"`));
  assert.ok(html.includes('one@example.com'));
  assert.ok(html.includes(strings.status.green));
  assert.ok(html.includes('15/10/2026'));
  assert.ok(html.includes(esc(strings.pages(20, 31))));
  assert.ok(html.includes(esc(strings.streakDays(3))));
  assert.ok(html.includes(esc(strings.booksCell(2, 1))));
});

test('every status is a visible word on the card, not only a colour', () => {
  for (const status of ['green', 'orange', 'red']) {
    const html = renderOverview(overview({ testers: [tester({ status })] }), strings);
    assert.ok(html.includes(`class="chip c-${status}"`), status);
    assert.ok(html.includes(esc(strings.status[status])), status);
  }
});

test('the activity strip has 14 squares, marks the counted days and flags today', () => {
  const html = renderOverview(overview({ testers: [tester({ activeDays: ['2026-10-16', '2026-10-15', '2026-10-10'] })] }), strings);
  assert.equal(count(html, '<span class="sq'), 14);
  assert.equal(count(html, 'class="sq on'), 3);
  assert.equal(count(html, ' today"'), 1);
  assert.ok(html.includes(esc(strings.stripLabel(3))));
});

test('days outside the 14 day window are not marked', () => {
  const html = renderOverview(overview({ testers: [tester({ activeDays: ['2026-10-02'] })] }), strings);
  assert.equal(count(html, 'class="sq on'), 0);
});

test('an older server that does not send activeDays still renders a strip', () => {
  const old = tester();
  delete old.activeDays;
  const html = renderOverview(overview({ testers: [old] }), strings);
  assert.equal(count(html, '<span class="sq'), 14);
  assert.equal(count(html, 'class="sq on'), 0);
});

test('the check score is a coloured chip: green from 80, red below, plain when not taken', () => {
  assert.ok(renderOverview(overview({ testers: [tester({ latestCheck: { score: 92, attempts: 1, date: 'x' } })] }), strings).includes('chip c-green">92'));
  assert.ok(renderOverview(overview({ testers: [tester({ latestCheck: { score: 68, attempts: 3, date: 'x' } })] }), strings).includes('chip c-red">68'));
  assert.ok(renderOverview(overview({ testers: [tester({ latestCheck: null })] }), strings).includes(strings.checkNone));
});

test('a tester stuck at the gate is flagged on the card', () => {
  const html = renderOverview(overview({ testers: [tester({ latestCheck: { score: 60, attempts: 3, date: 'x' } })] }), strings);
  assert.ok(html.includes(esc(strings.stuckChip)));
});

test('the callout lists only people who need action now, with the reason in words', () => {
  const html = renderOverview(
    overview({
      testers: [tester()],
      attention: [
        { userId: 'a', email: 'a@example.com', reason: 'inactive', days: 5 },
        { userId: 'c', email: 'c@example.com', reason: 'stuck_at_gate', days: null },
        { userId: 'b', email: 'b@example.com', reason: 'never_told', days: 6 },
      ],
    }),
    strings
  );
  assert.ok(html.includes('class="callout"'));
  assert.ok(html.includes(esc(strings.reasonInactive(5))));
  assert.ok(html.includes(esc(strings.reasonStuck)));
  assert.ok(!html.includes('b@example.com'));
});

test('no callout when only never-told testers exist', () => {
  const html = renderOverview(overview({ attention: [{ userId: 'b', email: 'b@example.com', reason: 'never_told', days: 6 }] }), strings);
  assert.ok(!html.includes('class="callout"'));
});

test('a tester with no email shows a fallback and does not crash', () => {
  const html = renderOverview(overview({ testers: [tester({ email: null }), neverTold('b', null)] }), strings);
  assert.ok(html.includes(strings.noEmail));
});

test('nobody registered: a friendly empty state and no tiles', () => {
  const html = renderOverview(
    overview({ totals: { registered: 0, toldToday: 0, inactive3Plus: 0 }, funnel: { registered: 0, addedBook: 0, toldFirstTime: 0, passedFirstCheck: 0 } }),
    strings
  );
  assert.ok(html.includes(strings.testersNone));
  assert.ok(!html.includes('class="kpis"'));
  assert.ok(!html.includes('NaN'));
});

test('the pending time stat is one note, not a placeholder on every card', () => {
  const html = renderOverview(overview({ testers: [tester({ userId: 'a' }), tester({ userId: 'b' }), tester({ userId: 'c' })] }), strings);
  assert.equal(count(html, strings.timeNote), 1);
  assert.ok(!html.includes(strings.statTime));
});

test('once time tracking is available each card shows time and opens', () => {
  const html = renderOverview(overview({ timeTracking: { available: true }, testers: [tester({ activeMinutes7d: 42, opens7d: 9 })] }), strings);
  assert.ok(html.includes(esc(strings.timeCell(42, 9))));
  assert.ok(html.includes(strings.statTime));
  assert.ok(!html.includes(strings.timeNote));
});

test('the funnel shows share of registered and the drop from the previous step', () => {
  const html = renderOverview(overview(), strings);
  for (const expected of ['100%', '83%', '67%', '42%', 'נשרו 2', 'נשרו 3']) assert.ok(html.includes(expected), expected);
});

test('the chart prints its numbers on the chart and has a table for screen readers', () => {
  const html = renderOverview(overview({ apiUsage: [{ date: '2026-10-15', calls: 40 }, { date: '2026-10-16', calls: 180 }] }), strings);
  assert.ok(html.includes('class="chart"'));
  assert.ok(html.includes('>180<'));
  assert.ok(html.includes(esc(strings.apiCeilingLabel(250))));
  assert.ok(html.includes('class="sr-only"'));
  assert.ok(html.includes('15/10/2026'));
});

test('hostile values in emails and book titles are escaped everywhere in the overview', () => {
  const hostile = '<script>alert(1)</script>';
  const html = renderOverview(
    overview({
      testers: [tester({ email: hostile, lastEntryBook: hostile }), neverTold('b', hostile)],
      attention: [{ userId: ID, email: hostile, reason: 'inactive', days: 5 }],
    }),
    strings
  );
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('a tester id that is not a uuid never reaches an attribute unescaped', () => {
  const html = renderOverview(overview({ testers: [tester({ userId: '"><img src=x onerror=alert(1)>' }), neverTold('"><img src=y onerror=alert(2)>', 'x@example.com')] }), strings);
  assert.ok(!html.includes('<img'));
});

const detail = {
  userId: ID,
  email: 'one@example.com',
  history: [
    { date: '2026-10-15', bookTitle: 'ספר', pageFrom: 20, pageTo: 31 },
    { date: '2026-10-14', bookTitle: 'ספר', pageFrom: 1, pageTo: 19 },
  ],
  lastEntry: { entryId: 'e', date: '2026-10-15', bookTitle: 'ספר', pageFrom: 20, pageTo: 31, text: 'סיפרתי על הפרק' },
};

test('detail: back link, header with avatar, the last entry on the notebook page, and the history', () => {
  const html = renderTesterDetail(detail, strings, '2026-10-16');
  assert.ok(html.includes('href="#/"'));
  assert.ok(html.includes('class="av'));
  assert.ok(html.includes('class="said"'));
  assert.ok(html.includes('dir="auto"'));
  assert.ok(html.includes('סיפרתי על הפרק'));
  assert.ok(html.includes('15/10/2026'));
  assert.ok(html.includes('14/10/2026'));
});

test('detail: the activity strip is built from the history relative to the given today', () => {
  const html = renderTesterDetail(detail, strings, '2026-10-16');
  assert.equal(count(html, '<span class="sq'), 14);
  assert.equal(count(html, 'class="sq on'), 2);
});

test('detail escapes what the tester said, their email and book titles', () => {
  const hostile = '<script>alert(1)</script><img src=x onerror=alert(2)>';
  const html = renderTesterDetail(
    { userId: ID, email: hostile, history: [{ date: '2026-10-15', bookTitle: hostile, pageFrom: 1, pageTo: 5 }], lastEntry: { entryId: 'e', date: '2026-10-15', bookTitle: hostile, pageFrom: 1, pageTo: 5, text: hostile } },
    strings,
    '2026-10-16'
  );
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('detail copes with a tester who has no entries and no email', () => {
  const html = renderTesterDetail({ userId: ID, email: null, history: [], lastEntry: null }, strings, '2026-10-16');
  assert.ok(html.includes(strings.detailHistoryNone));
  assert.ok(html.includes(strings.noEmail));
});
