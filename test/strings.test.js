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
  assert.ok(!strings.loading.includes('...'));
});

test('lede: told today, and how many need attention', () => {
  assert.equal(strings.lede(12, 5, 2), '5 מתוך 12 בודקים סיפרו היום. 2 דורשים תשומת לב.');
  assert.equal(strings.lede(12, 5, 1), '5 מתוך 12 בודקים סיפרו היום. אחד דורש תשומת לב.');
  assert.equal(strings.lede(12, 5, 0), '5 מתוך 12 בודקים סיפרו היום. אף אחד לא דורש תשומת לב.');
  assert.equal(strings.lede(12, 0, 0), 'אף אחד מ-12 הבודקים לא סיפר היום. אף אחד לא דורש תשומת לב.');
});

test('lede with nobody registered is the empty-state sentence', () => {
  assert.equal(strings.lede(0, 0, 0), strings.testersNone);
});

test('funnel drop wording', () => {
  assert.equal(strings.funnelDrop(3), 'נשרו 3');
  assert.equal(strings.funnelDrop(0), 'אף אחד לא נשר');
});

test('the threshold note states both thresholds', () => {
  assert.ok(strings.thresholdNote.includes('2'));
  assert.ok(strings.thresholdNote.includes('4'));
});

test('every status has a word', () => {
  for (const key of ['green', 'orange', 'red', 'never']) assert.ok(strings.status[key].length > 0, key);
});
