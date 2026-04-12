import { test } from "node:test";
import assert from "node:assert/strict";
import {
  strengthToColor,
  strengthToLabel,
  RELATIONSHIP_STRENGTH_VALUES,
} from "./relationship-strength";

test("strengthToColor: returns distinct hex for each enum value", () => {
  const colors = RELATIONSHIP_STRENGTH_VALUES.map(strengthToColor);
  for (const c of colors) {
    assert.match(c, /^#[0-9a-fA-F]{6}$/, `expected hex, got ${c}`);
  }
  const uniq = new Set(colors);
  assert.equal(uniq.size, colors.length, "all enum values map to distinct colors");
});

test("strengthToColor: strong maps to CE gold accent", () => {
  assert.equal(strengthToColor("strong"), "#e9c176");
});

test("strengthToColor: cold is red", () => {
  assert.equal(strengthToColor("cold"), "#ef4444");
});

test("strengthToColor: nullish/unknown input returns muted fallback (not throw)", () => {
  const fallback = strengthToColor(null);
  assert.match(fallback, /^#[0-9a-fA-F]{6}$/);
  assert.equal(strengthToColor(undefined), fallback);
  assert.equal(strengthToColor("bogus"), fallback);
  assert.equal(strengthToColor(42), fallback);
});

test("strengthToLabel: surfaces human label per enum", () => {
  assert.equal(strengthToLabel("strong"), "Strong relationship");
  assert.equal(strengthToLabel("medium"), "Medium relationship");
  assert.equal(strengthToLabel("weak"), "Weak relationship");
  assert.equal(strengthToLabel("cold"), "Cold");
  assert.equal(strengthToLabel(null), "Unknown");
  assert.equal(strengthToLabel("xxx"), "Unknown");
});
