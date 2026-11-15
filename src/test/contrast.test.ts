// src/test/contrast.test.ts
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const root = readFileSync("src/app/globals.css", "utf8").match(/:root\s*\{([^}]*)\}/)![1];
const vars = Object.fromEntries([...root.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2]]));

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const tones = ["neutral", "info", "progress", "warning", "success", "pending", "done", "danger"];
const bands = ["status", "money", "weight"];
const pairs: [string, string][] = [
  ["foreground", "background"], ["foreground", "card"],
  ["muted-foreground", "background"], ["muted-foreground", "card"], ["muted-foreground", "muted"], ["muted-foreground", "tile"],
  ["primary", "card"], ["primary-foreground", "primary"], ["secondary-foreground", "secondary"],
  ["success", "card"], ["destructive", "card"],
  ["rail-foreground", "rail"], ["rail-active-foreground", "rail-active"],
  ["sidebar-foreground", "sidebar"], ["sidebar-accent-foreground", "sidebar-accent"],
  ...tones.map((t): [string, string] => [`tone-${t}-foreground`, `tone-${t}`]),
  ...bands.map((b): [string, string] => [`band-${b}-foreground`, `band-${b}`]),
  ...bands.map((b): [string, string] => ["foreground", `band-${b}-soft`]),
];

test.each(pairs)("%s on %s reaches 4.5:1", (text, surface) => {
  expect(vars[text], `--${text} must be a 6-digit hex in :root`).toBeDefined();
  expect(vars[surface], `--${surface} must be a 6-digit hex in :root`).toBeDefined();
  expect(contrast(vars[text], vars[surface])).toBeGreaterThanOrEqual(4.5);
});
