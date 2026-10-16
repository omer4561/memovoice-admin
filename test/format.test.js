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
