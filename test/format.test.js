import test from 'node:test';
import assert from 'node:assert/strict';
import { esc, formatDate, formatDateTime } from '../src/format.js';

test('formatDate shows a date key as day/month/year without shifting it', () => {
  assert.equal(formatDate('2026-10-05'), '05/10/2026');
});

test('formatDate shows a timestamp by Israel date', () => {
  assert.equal(formatDate('2026-10-24T22:30:00Z'), '25/10/2026');
});

test('formatDateTime uses Israel time and a 24 hour clock', () => {
  assert.equal(formatDateTime('2026-10-16T21:05:00Z'), '17/10/2026 00:05');
  assert.equal(formatDateTime('2026-10-16T09:07:00Z'), '16/10/2026 12:07');
});

test('esc escapes every HTML special character', () => {
  const out = esc(`<img src=x onerror="alert('1')"> & more`);
  assert.ok(!out.includes('<'));
  assert.ok(!out.includes('>'));
  assert.ok(!out.includes('"'));
  assert.ok(!out.includes("'"));
  assert.ok(out.includes('&amp;'));
});

test('esc turns null and undefined into an empty string', () => {
  assert.equal(esc(null), '');
  assert.equal(esc(undefined), '');
});

import { addDays, dayDiff, initials, israelDateKey } from '../src/format.js';

test('israelDateKey gives the Israel date, not the UTC date', () => {
  assert.equal(israelDateKey('2026-10-24T22:30:00Z'), '2026-10-25');
  assert.equal(israelDateKey('2026-10-25T21:30:00Z'), '2026-10-25');
});

test('dayDiff counts whole days, never negative, and survives the clock change', () => {
  assert.equal(dayDiff('2026-10-14', '2026-10-16'), 2);
  assert.equal(dayDiff('2026-10-26', '2026-10-24'), 0);
  assert.equal(dayDiff('2026-10-24', '2026-10-26'), 2);
});

test('addDays moves a date key by whole days across month and clock-change boundaries', () => {
  assert.equal(addDays('2026-10-16', -13), '2026-10-03');
  assert.equal(addDays('2026-10-01', -1), '2026-09-30');
  assert.equal(addDays('2026-10-24', 2), '2026-10-26');
});

test('initials come from the first letters of the email name', () => {
  assert.equal(initials('dana.cohen@gmail.com'), 'DC');
  assert.equal(initials('noam.l@gmail.com'), 'NL');
  assert.equal(initials('roni@x.com'), 'RO');
  assert.equal(initials('amit.katz1@gmail.com'), 'AK');
  assert.equal(initials('מאיה.גולן@x.com'), 'מג');
});

test('initials fall back to a question mark when there is nothing usable', () => {
  assert.equal(initials(null), '?');
  assert.equal(initials(''), '?');
  assert.equal(initials('123@x.com'), '?');
});
