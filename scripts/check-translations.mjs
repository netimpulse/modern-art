#!/usr/bin/env node
/**
 * Verifies that every translation key used by the theme exists in both
 * languages (Theme Check does not catch missing `t:` schema keys).
 *
 *   - `t:` keys in schemas, settings_schema.json and JSON templates
 *       → locales/en.default.schema.json + locales/de.schema.json
 *   - `'key' | t` in Liquid → locales/en.default.json + locales/de.json
 *
 * Also reports keys that exist in one language file but not the other.
 * Usage: node scripts/check-translations.mjs   (exit code 1 on problems)
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const dirs = ["blocks", "config", "layout", "sections", "snippets", "templates"];

function readJson(file) {
  const text = fs.readFileSync(path.join(root, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  return JSON.parse(text.replace(/,(\s*[}\]])/g, "$1"));
}

function flatten(obj, prefix = "", out = new Set()) {
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") flatten(value, full, out);
    else out.add(full);
  }
  return out;
}

function hasKey(keys, key) {
  // Pluralised storefront strings are stored as key.one / key.other.
  return keys.has(key) || keys.has(`${key}.one`) || keys.has(`${key}.other`);
}

const schemaKeys = new Set();
const storefrontKeys = new Set();
for (const dir of dirs) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) continue;
  for (const name of fs.readdirSync(full)) {
    const text = fs.readFileSync(path.join(full, name), "utf8");
    for (const m of text.matchAll(/"t:([a-z0-9_.]+)"/g)) schemaKeys.add(m[1]);
    for (const m of text.matchAll(/['"]([a-z0-9_]+(?:\.[a-z0-9_]+)+)['"]\s*\|\s*t\b/g)) storefrontKeys.add(m[1]);
  }
}

const problems = [];
const pairs = [
  ["locales/en.default.schema.json", "locales/de.schema.json", schemaKeys],
  ["locales/en.default.json", "locales/de.json", storefrontKeys],
];
for (const [enFile, deFile, used] of pairs) {
  const en = flatten(readJson(enFile));
  const de = fs.existsSync(path.join(root, deFile)) ? flatten(readJson(deFile)) : new Set();
  for (const key of used) {
    if (!hasKey(en, key)) problems.push(`${enFile}: missing ${key}`);
    if (!hasKey(de, key)) problems.push(`${deFile}: missing ${key}`);
  }
  for (const key of en) if (!de.has(key)) problems.push(`${deFile}: missing ${key} (present in ${enFile})`);
  for (const key of de) if (!en.has(key)) problems.push(`${enFile}: missing ${key} (present in ${deFile})`);
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`translations ok (${schemaKeys.size} schema keys, ${storefrontKeys.size} storefront keys)`);
