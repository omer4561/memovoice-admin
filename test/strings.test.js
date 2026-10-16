import test from 'node:test';
import assert from 'node:assert/strict';
import { strings } from '../src/strings.js';

const GERESH = '׳';

test('Hebrew abbreviations use a geresh, not an ASCII apostrophe', () => {
  assert.ok(strings.pages(1, 2).includes(GERESH));
  assert.ok(strings.timeCell(5, 2).includes(GERESH));
  assert.ok(!strings.pages(1, 2).includes("'"));
  assert.ok(!strings.timeCell(5, 2).includes("'"));
});

test('loading text uses a real ellipsis, never three periods', () => {
  assert.ok(strings.loading.includes('…'));
  assert.ok(strings.refreshing.includes('…'));
  assert.ok(!strings.loading.includes('...'));
});

test('funnel drop wording', () => {
  assert.equal(strings.funnelDrop(3), 'נשרו 3');
  assert.equal(strings.funnelDrop(0), 'אף אחד לא נשר');
});

test('registered-ago wording handles today, yesterday and older', () => {
  assert.equal(strings.registeredAgo(0), 'נרשם היום');
  assert.equal(strings.registeredAgo(1), 'נרשם אתמול');
  assert.equal(strings.registeredAgo(6), 'נרשם לפני 6 ימים');
});

test('the oldest-waiting note handles zero days', () => {
  assert.equal(strings.notStartedNote(0), 'הוותיק ביותר נרשם היום.');
  assert.equal(strings.notStartedNote(6), 'הוותיק ביותר נרשם לפני 6 ימים.');
});

test('the threshold note states both thresholds', () => {
  assert.ok(strings.thresholdNote.includes('2'));
  assert.ok(strings.thresholdNote.includes('4'));
});

test('every status has a word', () => {
  for (const key of ['green', 'orange', 'red', 'never']) assert.ok(strings.status[key].length > 0, key);
});
