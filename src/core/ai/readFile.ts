"use client";

/**
 * On-device file → text. Pulls the text layer out of a PDF entirely in the
 * browser — no network, no API key — so transcripts, syllabi, and class
 * schedules can be read privately. pdf.js is lazy-loaded so it never weighs the
 * app down until someone actually opens a PDF.
 *
 * Scanned / image-only PDFs have no text layer and return "" — the caller then
 * falls back to the server vision path (which needs an API key).
 */

/** True when a file looks like a PDF (by MIME type or extension). */
export function isPdf(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // Point pdf.js at its bundled worker (emitted as a static asset by webpack).
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  const lines: string[] = [];
  try {
    for (let page = 1; page <= doc.numPages; page++) {
      const content = await (await doc.getPage(page)).getTextContent();
      // Rebuild real lines: a vertical position change or an explicit EOL marks
      // a line break. Keeping rows intact matters — transcript parsing reads
      // the grade column per row.
      let line = "";
      let lastY: number | null = null;
      for (const it of content.items) {
        if (!("str" in it)) continue;
        const y = it.transform?.[5];
        if (lastY !== null && typeof y === "number" && Math.abs(y - lastY) > 2 && line) {
          lines.push(line);
          line = "";
        }
        if (typeof y === "number") lastY = y;
        line += (line ? " " : "") + it.str;
        if (it.hasEOL && line) {
          lines.push(line);
          line = "";
        }
      }
      if (line) lines.push(line);
      lastY = null;
    }
  } finally {
    await doc.destroy();
  }
  // Collapse the runs of spaces pdf.js leaves between glyph groups.
  return lines.join("\n").replace(/[ \t]+/g, " ").trim();
}
