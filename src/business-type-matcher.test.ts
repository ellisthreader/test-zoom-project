import assert from "node:assert/strict";
import test from "node:test";
import { businessCategorySeeds } from "./business-category-data";
import { buildBusinessTaxonomy, getBusinessSuggestionEntries } from "./business-type-matcher";

const taxonomy = buildBusinessTaxonomy(businessCategorySeeds);

function suggestionLabels(input: string) {
  return getBusinessSuggestionEntries(input, taxonomy).map((match) => match.entry?.title);
}

function firstSuggestion(input: string) {
  return suggestionLabels(input)[0];
}

test("software typo does not match soft drink manufacturing", () => {
  const labels = suggestionLabels("Softare as as");

  assert.equal(labels[0], "Software company");
  assert.ok(!labels.includes("Soft drink manufacturer"));
});

test("software aliases resolve to the SaaS category", () => {
  assert.equal(firstSuggestion("saas"), "Software company");
  assert.equal(firstSuggestion("software company"), "Software company");
  assert.equal(firstSuggestion("software as a service"), "Software company");
  assert.equal(firstSuggestion("software as a servce"), "Software company");
});

test("soft drink still resolves when the user asks for it specifically", () => {
  assert.equal(firstSuggestion("soft drink"), "Soft drink manufacturer");
  assert.equal(firstSuggestion("soft drink manufacturer"), "Soft drink manufacturer");
});

test("weak generic inputs do not produce noisy suggestions", () => {
  assert.deepEqual(suggestionLabels("company"), []);
  assert.deepEqual(suggestionLabels("service"), []);
  assert.deepEqual(suggestionLabels("business"), []);
  assert.deepEqual(suggestionLabels("store"), []);
});

test("common misspellings and local business terms resolve to expected categories", () => {
  assert.equal(firstSuggestion("dentst"), "Dental clinic");
  assert.equal(firstSuggestion("estate agncy"), "Estate agency");
  assert.equal(firstSuggestion("book shp"), "Bookshop");
  assert.equal(firstSuggestion("plumber"), "Plumbing company");
  assert.equal(firstSuggestion("hairdresser"), "Hair salon");
});
