// Client-only text extraction from PDF / Word (.docx) / PowerPoint (.pptx) / text.
// No npm dependencies: DOCX/PPTX are unzipped with the native DecompressionStream
// and their XML text is pulled out; PDFs use pdf.js loaded from a CDN on demand.

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
    return (await file.text()).slice(0, 20000);
  }
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return extractPdf(file);
  }
  if (name.endsWith(".docx")) {
    return extractOoxml(file, (fn) => fn === "word/document.xml", /<w:t[^>]*>([\s\S]*?)<\/w:t>/g);
  }
  if (name.endsWith(".pptx")) {
    return extractOoxml(file, (fn) => /^ppt\/slides\/slide\d+\.xml$/.test(fn), /<a:t[^>]*>([\s\S]*?)<\/a:t>/g);
  }
  if (name.endsWith(".doc") || name.endsWith(".ppt")) {
    throw new Error("Old .doc/.ppt files aren't supported — re-save as .docx or .pptx and try again.");
  }
  throw new Error("Unsupported file. Use PDF, Word (.docx), PowerPoint (.pptx), or an image.");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

// ---------- PDF (pdf.js from CDN) ----------
async function extractPdf(file: File): Promise<string> {
  const CDN = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build";
  let pdfjs: any;
  try {
    pdfjs = await import(/* @vite-ignore */ `${CDN}/pdf.min.mjs`);
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = `${CDN}/pdf.worker.min.mjs`;
    } catch {
      /* ignore */
    }
  } catch {
    throw new Error("Couldn't load the PDF reader. Check your connection, or upload the pages as images instead.");
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  let out = "";
  for (let p = 1; p <= doc.numPages && out.length < 20000; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    out += content.items.map((it: any) => (typeof it.str === "string" ? it.str : "")).join(" ") + "\n";
  }
  const text = out.trim();
  if (!text) throw new Error("That PDF has no selectable text (it may be scanned). Try uploading it as an image.");
  return text;
}

// ---------- OOXML (.docx / .pptx) via native unzip ----------
type ZipEntry = { name: string; method: number; compSize: number; localOffset: number };

async function extractOoxml(file: File, matchName: (fn: string) => boolean, tagRe: RegExp): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const entries = readCentralDirectory(buf)
    .filter((e) => matchName(e.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  let out = "";
  for (const e of entries) {
    const xml = await readEntry(buf, e);
    const parts: string[] = [];
    tagRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(xml))) parts.push(decodeEntities(m[1]));
    const text = parts.join(" ").replace(/\s+/g, " ").trim();
    if (text) out += text + "\n";
    if (out.length > 20000) break;
  }
  const result = out.trim();
  if (!result) throw new Error("Couldn't find any text in that file.");
  return result;
}

function readCentralDirectory(buf: Uint8Array): ZipEntry[] {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  const min = Math.max(0, buf.length - 22 - 65536);
  for (let i = buf.length - 22; i >= min; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("That doesn't look like a valid Office file.");

  const cdCount = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const entries: ZipEntry[] = [];
  for (let i = 0; i < cdCount; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localOffset = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nameLen));
    entries.push({ name, method, compSize, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function readEntry(buf: Uint8Array, e: ZipEntry): Promise<string> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const lo = e.localOffset;
  if (dv.getUint32(lo, true) !== 0x04034b50) throw new Error("Corrupt Office file.");
  const nameLen = dv.getUint16(lo + 26, true);
  const extraLen = dv.getUint16(lo + 28, true);
  const start = lo + 30 + nameLen + extraLen;
  const compData = buf.subarray(start, start + e.compSize);

  let bytes: Uint8Array;
  if (e.method === 0) {
    bytes = compData;
  } else if (e.method === 8) {
    const ds = new DecompressionStream("deflate-raw" as CompressionFormat);
    const ab = await new Response(new Blob([compData]).stream().pipeThrough(ds)).arrayBuffer();
    bytes = new Uint8Array(ab);
  } else {
    throw new Error("Unsupported compression in that file.");
  }
  return new TextDecoder("utf-8").decode(bytes);
}
