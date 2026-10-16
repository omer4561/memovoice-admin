import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// מחשב את יחס הניגודיות (WCAG 2.1) לכל זוג טקסט/רקע שהאתר משתמש בו, ביום ובלילה,
// ישירות מ-tokens.css. ערך שנשבר בעריכה עתידית יכשיל את הבדיקה ולא יגיע לבעל המוצר.
const css = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8');

function parseTokens(block) {
  const tokens = {};
  for (const match of block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) tokens[match[1]] = match[2];
  return tokens;
}

const darkStart = css.indexOf('@media (prefers-color-scheme: dark)');
assert.ok(darkStart > 0, 'dark block missing');
const day = parseTokens(css.slice(0, darkStart));
const night = { ...day, ...parseTokens(css.slice(darkStart)) };

function luminance(hex) {
  const channel = (i) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [טקסט, רקע, סף]. 4.5 לטקסט רגיל, 3 לטבעות פוקוס ולכפתורים גדולים.
const PAIRS = [
  ['ink', 'paper', 4.5],
  ['ink', 'paper-lo', 4.5],
  ['ink-soft', 'paper', 4.5],
  ['ink-soft', 'paper-lo', 4.5],
  ['primary', 'paper', 4.5],
  ['primary', 'paper-lo', 4.5],
  ['on-primary', 'primary', 4.5],
  ['red-text', 'paper', 4.5],
  ['green-text', 'paper', 4.5],
  ['ink', 'primary-veil', 4.5],
  ['primary', 'red-veil', 4.5],
  ['green-text', 'green-veil', 4.5],
  ['red-text', 'red-veil', 4.5],
  ['ink-soft', 'red-veil', 4.5],
  ['ink', 'red-veil', 4.5],
  ['ink', 'green-veil', 4.5],
  ['ink', 'yellow-veil', 4.5],
  ['on-ground', 'ground', 4.5],
  ['on-ground-soft', 'ground', 4.5],
  // טבעות פוקוס: מול הנייר, ומול החדר (הכותרת וסרגל הכלים יושבים על החדר)
  ['focus-paper', 'paper', 3],
  ['focus-paper', 'paper-lo', 3],
  ['focus-ground', 'ground', 3],
];

for (const [name, tokens] of [['day', day], ['night', night]]) {
  for (const [fg, bg, min] of PAIRS) {
    test(`${name}: ${fg} on ${bg} is at least ${min}:1`, () => {
      const value = ratio(tokens[fg], tokens[bg]);
      assert.ok(value >= min, `${fg} ${tokens[fg]} on ${bg} ${tokens[bg]} is ${value.toFixed(2)}:1`);
    });
  }
}

test('the app primary button text no longer sits at 4.38:1 (regression for the audit finding)', () => {
  assert.ok(ratio(day['on-primary'], day.primary) > 4.5);
  assert.ok(ratio(night['on-primary'], night.primary) > 4.5);
});
