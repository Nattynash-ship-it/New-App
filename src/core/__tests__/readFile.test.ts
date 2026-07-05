import { describe, expect, it } from "vitest";
import { isPdf } from "../ai/readFile";

// A tiny stand-in for File so we don't need the DOM — isPdf only reads .type/.name.
function fakeFile(name: string, type: string): File {
  return { name, type } as File;
}

describe("isPdf", () => {
  it("detects PDFs by MIME type", () => {
    expect(isPdf(fakeFile("transcript", "application/pdf"))).toBe(true);
  });

  it("detects PDFs by extension when the MIME is missing or generic", () => {
    expect(isPdf(fakeFile("Transcript.PDF", ""))).toBe(true);
    expect(isPdf(fakeFile("schedule.pdf", "application/octet-stream"))).toBe(true);
  });

  it("rejects images and other files", () => {
    expect(isPdf(fakeFile("screenshot.png", "image/png"))).toBe(false);
    expect(isPdf(fakeFile("notes.txt", "text/plain"))).toBe(false);
  });
});
