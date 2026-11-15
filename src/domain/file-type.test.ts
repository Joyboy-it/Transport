import { describe, expect, it } from "vitest";
import { detectFileType, MAX_FILE_BYTES } from "./file-type";

const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(16).fill(0)]);
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

describe("detectFileType", () => {
  it("recognises the allowed formats by content", () => {
    expect(detectFileType("ticket.JPG", bytes(0xff, 0xd8, 0xff, 0xe0))).toEqual({ ok: true, mime: "image/jpeg", ext: "jpg" });
    expect(detectFileType("t.jpeg", bytes(0xff, 0xd8, 0xff, 0xe1))).toEqual({ ok: true, mime: "image/jpeg", ext: "jpg" });
    expect(detectFileType("t.png", bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toEqual({ ok: true, mime: "image/png", ext: "png" });
    expect(detectFileType("t.webp", bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")))).toEqual({ ok: true, mime: "image/webp", ext: "webp" });
    expect(detectFileType("t.pdf", bytes(...ascii("%PDF-1.7")))).toEqual({ ok: true, mime: "application/pdf", ext: "pdf" });
  });

  it("rejects other extensions", () => {
    expect(detectFileType("t.gif", bytes(...ascii("GIF89a")))).toEqual({ ok: false, reason: "TYPE" });
    expect(detectFileType("noext", bytes(0xff, 0xd8, 0xff))).toEqual({ ok: false, reason: "TYPE" });
  });

  it("rejects content that does not match the extension", () => {
    expect(detectFileType("evil.png", bytes(...ascii("<html>")))).toEqual({ ok: false, reason: "CONTENT" });
    expect(detectFileType("photo.jpg", bytes(...ascii("%PDF-1.4")))).toEqual({ ok: false, reason: "CONTENT" });
  });

  it("allows up to 10 MB", () => {
    expect(MAX_FILE_BYTES).toBe(10 * 1024 * 1024);
  });
});
