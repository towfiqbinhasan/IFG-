#!/usr/bin/env node
/**
 * Builds docs/USER_MANUAL.pdf (English) and docs/USER_MANUAL.bn.pdf (Bangla)
 * from the Markdown manuals (with their screenshots in docs/images/manual/),
 * using headless Google Chrome.
 *
 *   npm run manual:pdf
 *
 * Needs Google Chrome / Chromium (set CHROME=/path/to/chrome if it isn't on PATH)
 * and, for the Bangla manual, the "Noto Sans Bengali" font installed.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Marked } from "marked";

const root = resolve(import.meta.dirname, "..");
const chrome = process.env.CHROME || "google-chrome";

const MANUALS = [
  { src: "docs/USER_MANUAL.md", out: "docs/USER_MANUAL.pdf", lang: "en", font: `"Noto Sans", "Inter", system-ui, sans-serif` },
  { src: "docs/USER_MANUAL.bn.md", out: "docs/USER_MANUAL.bn.pdf", lang: "bn", font: `"Noto Sans Bengali", "Noto Sans", system-ui, sans-serif` },
];

/** GitHub-style heading slug, so the table of contents links work inside the PDF. */
function slug(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s/g, "-");
}

function render(md) {
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading(text, level, raw) {
        return `<h${level} id="${slug(raw)}">${text}</h${level}>\n`;
      },
    },
  });
  // Links between the two manuals point at the PDFs instead of the .md files.
  return marked.parse(md.replace(/\((USER_MANUAL(?:\.bn)?)\.md\)/g, "($1.pdf)"));
}

const css = (font) => `
  @page { size: A4; margin: 18mm 16mm 20mm;
    @bottom-center { content: counter(page) " / " counter(pages); font: 9pt ${font}; color: #64748b; } }
  * { box-sizing: border-box; }
  body { font-family: ${font}; font-size: 10.5pt; line-height: 1.6; color: #0f172a; margin: 0; }
  h1 { font-size: 24pt; line-height: 1.2; margin: 0 0 4pt; color: #0a2a5e; }
  h1 + p { margin-top: 0; }
  h2 { font-size: 16pt; color: #0a2a5e; margin: 0 0 8pt; padding-bottom: 4pt; border-bottom: 2.5pt solid #22b0f0; break-before: page; }
  h2#contents, h2#সূচিপত্র { break-before: auto; margin-top: 18pt; }
  h3 { font-size: 12.5pt; color: #1565c0; margin: 16pt 0 6pt; break-after: avoid; }
  p, li { orphans: 3; widows: 3; }
  a { color: #1565c0; text-decoration: none; }
  code { font-family: "Noto Sans Mono", monospace; font-size: 9.5pt; background: #eef4fb; padding: 0 3pt; border-radius: 3pt; }
  strong { color: #0a2a5e; }
  hr { display: none; }
  table { width: 100%; border-collapse: collapse; margin: 8pt 0 12pt; font-size: 9.8pt; break-inside: auto; }
  tr { break-inside: avoid; }
  th { background: #0a2a5e; color: #fff; text-align: left; padding: 5pt 7pt; }
  td { border-bottom: 0.6pt solid #cbd5e1; padding: 5pt 7pt; vertical-align: top; }
  tr:nth-child(even) td { background: #f5f9fd; }
  blockquote { margin: 10pt 0; padding: 7pt 11pt; border-left: 3.5pt solid #22b0f0; background: #eef8fe; border-radius: 0 6pt 6pt 0; break-inside: avoid; }
  blockquote p { margin: 0; }
  ul, ol { padding-left: 18pt; }
  /* Screenshots: centred, framed, never split across pages; caption underneath. */
  p:has(> img) { text-align: center; font-size: 8.8pt; color: #64748b; break-inside: avoid; margin: 10pt 0 12pt; }
  p:has(> img) em { font-style: normal; }
  img { display: block; margin: 0 auto 4pt; max-width: 100%; max-height: 225mm; width: auto; height: auto;
        border: 0.8pt solid #cbd5e1; border-radius: 6pt; box-shadow: 0 2pt 8pt rgb(15 23 42 / 0.12); }
  .cover { background: linear-gradient(135deg, #0a2a5e, #1565c0 55%, #22b0f0); color: #fff; border-radius: 12pt; padding: 22pt 24pt; margin-bottom: 14pt; }
  .cover h1 { color: #fff; }
  .cover p, .cover strong, .cover a { color: #e6f4ff; }
`;

for (const m of MANUALS) {
  const md = readFileSync(join(root, m.src), "utf8");
  const body = render(md);
  // Wrap the title, subtitle and language line in a branded cover block.
  const firstHr = body.indexOf("<hr");
  const [cover, rest] = firstHr > 0 ? [body.slice(0, firstHr), body.slice(firstHr)] : ["", body];
  // <base> so relative image paths (images/manual/...) resolve from docs/.
  const base = pathToFileURL(join(root, "docs") + "/").href;
  const html = `<!doctype html><html lang="${m.lang}"><head><meta charset="utf-8"><base href="${base}"><title>User Manual</title>
    <style>${css(m.font)}</style></head><body><div class="cover">${cover}</div>${rest}</body></html>`;

  const dir = mkdtempSync(join(tmpdir(), "manual-"));
  const htmlPath = join(dir, "manual.html");
  writeFileSync(htmlPath, html);
  const out = join(root, m.out);
  execFileSync(
    chrome,
    ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--allow-file-access-from-files", "--virtual-time-budget=15000", `--print-to-pdf=${out}`, pathToFileURL(htmlPath).href],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  console.log(`✓ ${m.out}`);
}
