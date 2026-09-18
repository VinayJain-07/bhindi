import { documentMarkdown } from "./presentation";

export type DocumentBlock = { type: "h1" | "h2" | "h3" | "paragraph" | "bullet" | "number" | "quote"; text: string } | { type: "table"; rows: string[][] };

/**
 * Repairs common model-output typography before Markdown is displayed or exported.
 * Valid bold markers are preserved for the Markdown renderer, while stray single
 * asterisks and inconsistent list prefixes are converted to stable list syntax.
 */
export function normalizeDocumentMarkdown(value: string): string {
  const normalizedLines = documentMarkdown(value)
    .replace(/[\u2013\u2014]/g, " - ")
    .replace(/\u00a0/g, " ")
    .replace(/\\\*/g, "")
    .split(/\r?\n/)
    .map((line) => {
      const bullet = line.match(/^(\s*)(?:[\u2022\u25e6\u25aa+]\s*|\*(?!\*)\s+)(.+)$/);
      const numbered = line.match(/^(\s*)(\d+)[)]\s*(.+)$/);
      if (bullet) return `${bullet[1]}- ${bullet[2]}`;
      if (numbered) return `${numbered[1]}${numbered[2]}. ${numbered[3]}`;
      return line.replace(/(?<!\*)\*(?!\*)/g, "");
    });

  const output: string[] = [];
  const isListLine = (line: string) => /^\s*(?:[-+]\s+|\d+\.\s+)/.test(line);
  for (const rawLine of normalizedLines) {
    const line = rawLine.replace(/[ \t]+$/g, "");
    const previous = output.at(-1) ?? "";
    if (isListLine(line) && previous && !isListLine(previous)) output.push("");
    if (!isListLine(line) && line && isListLine(previous)) output.push("");
    output.push(line);
  }

  return output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function cleanInlineMarkdown(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/&#124;|&vert;/gi, "|")
    .trim();
}

export function parseMarkdown(markdown: string): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", text: cleanInlineMarkdown(paragraph.join(" ")) });
    paragraph = [];
  };
  const lines = normalizeDocumentMarkdown(markdown).replace(/\r/g, "").split("\n");
  const tableRow = (value: string) => value.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((cell) => cleanInlineMarkdown(cell.replace(/\\\|/g, "|")));
  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();
    if (!line) { flush(); continue; }
    if (line.includes("|") && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1] ?? "")) {
      flush();
      const rows = [tableRow(line)];
      index += 2;
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) { rows.push(tableRow(lines[index])); index += 1; }
      index -= 1;
      blocks.push({ type: "table", rows });
      continue;
    }
    if (/^###\s+/.test(line)) { flush(); blocks.push({ type: "h3", text: cleanInlineMarkdown(line.replace(/^###\s+/, "")) }); continue; }
    if (/^##\s+/.test(line)) { flush(); blocks.push({ type: "h2", text: cleanInlineMarkdown(line.replace(/^##\s+/, "")) }); continue; }
    if (/^#\s+/.test(line)) { flush(); blocks.push({ type: "h1", text: cleanInlineMarkdown(line.replace(/^#\s+/, "")) }); continue; }
    if (/^[-*+]\s+/.test(line)) { flush(); blocks.push({ type: "bullet", text: cleanInlineMarkdown(line.replace(/^[-*+]\s+/, "")) }); continue; }
    if (/^\d+[.)]\s+/.test(line)) { flush(); blocks.push({ type: "number", text: cleanInlineMarkdown(line.replace(/^\d+[.)]\s+/, "")) }); continue; }
    if (/^>\s?/.test(line)) { flush(); blocks.push({ type: "quote", text: cleanInlineMarkdown(line.replace(/^>\s?/, "")) }); continue; }
    paragraph.push(line);
  }
  flush();
  return blocks.filter((block) => block.type === "table" ? block.rows.length > 0 : Boolean(block.text));
}

export function safeFilename(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "smark-connect-report";
}
