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

test("common broad setup inputs produce selectable suggestions", () => {
  assert.equal(firstSuggestion("e-commerce"), "Online store");
  assert.equal(firstSuggestion("online retail"), "Retail business");
  assert.equal(firstSuggestion("retail"), "Retail business");
  assert.equal(firstSuggestion("manufacturing"), "Manufacturer");
  assert.equal(firstSuggestion("engineering"), "Engineering firm");
  assert.equal(firstSuggestion("consulting"), "Consulting firm");
  assert.equal(firstSuggestion("finance"), "Financial services firm");
  assert.equal(firstSuggestion("healthcare"), "Healthcare provider");
  assert.equal(firstSuggestion("hospitality"), "Hospitality business");
});

test("service and public-sector gaps resolve to expected categories", () => {
  assert.equal(firstSuggestion("lawyer"), "Law firm");
  assert.equal(firstSuggestion("accounting"), "Accountancy firm");
  assert.equal(firstSuggestion("seo"), "Digital agency");
  assert.equal(firstSuggestion("recruiter"), "Recruitment agency");
  assert.equal(firstSuggestion("nonprofit"), "Nonprofit organisation");
  assert.equal(firstSuggestion("charity"), "Nonprofit organisation");
  assert.equal(firstSuggestion("government"), "Government agency");
  assert.equal(firstSuggestion("public sector"), "Government agency");
});

test("healthcare and wellness setup inputs avoid misleading dead ends", () => {
  assert.equal(firstSuggestion("medical clinic"), "Medical practice");
  assert.equal(firstSuggestion("gp"), "Medical practice");
  assert.equal(firstSuggestion("hospital"), "Healthcare provider");
  assert.equal(firstSuggestion("clinic"), "Healthcare provider");
  assert.equal(firstSuggestion("therapist"), "Mental health clinic");
  assert.equal(firstSuggestion("physical therapist"), "Physiotherapy clinic");
  assert.equal(firstSuggestion("drugstore"), "Pharmacy");
  assert.equal(firstSuggestion("fitness studio"), "Gym or fitness centre");
  assert.equal(firstSuggestion("child care center"), "Nursery or childcare centre");
});

test("industrial and logistics terms cover common B2B business types", () => {
  assert.equal(firstSuggestion("3pl"), "Logistics company");
  assert.equal(firstSuggestion("third party logistics"), "Logistics company");
  assert.equal(firstSuggestion("warehousing"), "Logistics company");
  assert.equal(firstSuggestion("civil construction"), "Building contractor");
  assert.equal(firstSuggestion("energy"), "Energy company");
  assert.equal(firstSuggestion("water utility"), "Energy company");
  assert.equal(firstSuggestion("automotive supplier"), "Manufacturer");
  assert.equal(firstSuggestion("aerospace"), "Manufacturer");
  assert.equal(firstSuggestion("chemicals"), "Chemical manufacturer");
  assert.equal(firstSuggestion("packaging"), "Packaging manufacturer");
  assert.equal(firstSuggestion("industrial distributor"), "Wholesaler");
  assert.equal(firstSuggestion("metal fabrication"), "Manufacturer");
});

test("technology and media terms cover short and product-led inputs", () => {
  assert.equal(firstSuggestion("ai"), "AI company");
  assert.equal(firstSuggestion("AI company"), "AI company");
  assert.equal(firstSuggestion("IT services"), "IT support company");
  assert.equal(firstSuggestion("managed IT services"), "IT support company");
  assert.equal(firstSuggestion("telecom"), "Telecommunications company");
  assert.equal(firstSuggestion("media"), "Media company");
  assert.equal(firstSuggestion("podcast"), "Media company");
  assert.equal(firstSuggestion("creator"), "Media company");
  assert.equal(firstSuggestion("mobile app"), "Software company");
  assert.equal(firstSuggestion("marketplace platform"), "Software company");
  assert.equal(firstSuggestion("product business"), "Software company");
  assert.equal(firstSuggestion("game studio"), "Gaming company");
});

test("hospitality, food, tourism, events and local consumer inputs resolve", () => {
  assert.equal(firstSuggestion("food"), "Food service business");
  assert.equal(firstSuggestion("food service"), "Food service business");
  assert.equal(firstSuggestion("tourism"), "Travel agency");
  assert.equal(firstSuggestion("tourist attraction"), "Visitor attraction");
  assert.equal(firstSuggestion("event planner"), "Event venue");
  assert.equal(firstSuggestion("local consumer business"), "Hospitality business");
  assert.equal(firstSuggestion("floral shop"), "Florist");
});
