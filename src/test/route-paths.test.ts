import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { sourceFiles } from "./source-files";

test("no source file points at a pre-ERP address", () => {
  const legacy = /["'`]\/(jobs|queues|masters|settings)(?![\w-])/;
  const hits = sourceFiles().flatMap((file) =>
    readFileSync(file, "utf8").split("\n").flatMap((line, i) => (legacy.test(line) ? [`${file}:${i + 1}`] : [])),
  );
  expect(hits).toEqual([]);
});
