import { test } from 'vitest';
import assert from 'node:assert/strict';
import { glyphs, colors } from './letters.ts';

test('production scene has 24 distinct letters and distinct valid colors', () => {
  assert.equal(glyphs.length, 24);
  assert.equal(new Set(glyphs).size, 24);
  assert.equal(colors.length, glyphs.length);
  assert.equal(new Set(colors).size, 24);
  assert.ok(colors.every(color => /^#[0-9a-f]{6}$/i.test(color)));
  for (const pattern of [/\p{Script=Sinhala}/u, /\p{Script=Tamil}/u, /\p{Script=Greek}/u, /\p{Script=Latin}/u]) {
    assert.ok(glyphs.some(glyph => pattern.test(glyph)));
  }
});
