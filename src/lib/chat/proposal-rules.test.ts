import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldAutoApply, AUTO_APPLY_DENY_LIST } from "./proposal-rules";
import type { PageField } from "./page-bridge";

const textField: PageField = {
  name: "objective",
  label: "Objective",
  type: "text",
  value: "",
};

const textareaField: PageField = {
  name: "notes",
  label: "Notes",
  type: "textarea",
  value: "",
};

const selectField: PageField = {
  name: "pipeline_stage",
  label: "Stage",
  type: "select",
  value: "",
  options: ["prospect", "intro"],
};

test("shouldAutoApply: returns true for high-confidence text field, empty prior", () => {
  const ok = shouldAutoApply(
    { field: "objective", value: "Secure $25M", confidence: 0.95 },
    textField,
    ""
  );
  assert.equal(ok, true);
});

test("shouldAutoApply: returns true for textarea field at threshold", () => {
  const ok = shouldAutoApply(
    { field: "notes", value: "Met at SOSV event", confidence: 0.9 },
    textareaField,
    ""
  );
  assert.equal(ok, true);
});

test("shouldAutoApply: blocks select field regardless of confidence", () => {
  const ok = shouldAutoApply(
    { field: "pipeline_stage", value: "dd", confidence: 1.0 },
    selectField,
    ""
  );
  assert.equal(ok, false);
});

test("shouldAutoApply: blocks when field is on deny list", () => {
  const denyField: PageField = {
    ...textField,
    name: "commitment",
  };
  const ok = shouldAutoApply(
    { field: "commitment", value: "$5M", confidence: 1.0 },
    denyField,
    ""
  );
  assert.equal(ok, false);
});

test("shouldAutoApply: blocks when prior value is non-empty", () => {
  const ok = shouldAutoApply(
    { field: "objective", value: "Secure $25M", confidence: 0.95 },
    textField,
    "Existing objective text"
  );
  assert.equal(ok, false);
});

test("shouldAutoApply: treats whitespace-only prior as empty", () => {
  const ok = shouldAutoApply(
    { field: "objective", value: "Secure $25M", confidence: 0.95 },
    textField,
    "   \n  "
  );
  assert.equal(ok, true);
});

test("shouldAutoApply: blocks when confidence is below threshold", () => {
  const ok = shouldAutoApply(
    { field: "objective", value: "Secure $25M", confidence: 0.89 },
    textField,
    ""
  );
  assert.equal(ok, false);
});

test("shouldAutoApply: blocks when confidence is missing", () => {
  const ok = shouldAutoApply(
    { field: "objective", value: "Secure $25M" },
    textField,
    ""
  );
  assert.equal(ok, false);
});

test("shouldAutoApply: blocks when field not registered on page", () => {
  const ok = shouldAutoApply(
    { field: "unknown", value: "x", confidence: 1.0 },
    undefined,
    ""
  );
  assert.equal(ok, false);
});

test("AUTO_APPLY_DENY_LIST includes money and categorical fields", () => {
  assert.ok(AUTO_APPLY_DENY_LIST.includes("pipeline_stage"));
  assert.ok(AUTO_APPLY_DENY_LIST.includes("entity_code"));
  assert.ok(AUTO_APPLY_DENY_LIST.includes("commitment"));
  assert.ok(AUTO_APPLY_DENY_LIST.includes("deal_size"));
});
