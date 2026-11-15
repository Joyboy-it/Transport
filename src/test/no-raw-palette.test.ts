import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { sourceFiles } from "./source-files";

test("no component uses a raw Tailwind palette colour", () => {
  const raw = /(bg|text|border|ring)-(slate|gray|zinc|stone|red|rose|orange|amber|yellow|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|pink)-\d/;
  const hits = sourceFiles().flatMap((file) =>
    readFileSync(file, "utf8").split("\n").flatMap((line, i) => (raw.test(line) ? [`${file}:${i + 1}`] : [])),
  );
  expect(hits).toEqual([]);
});
