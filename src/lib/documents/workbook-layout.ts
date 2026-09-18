export function workbookSheetLabel(name: string): string {
  return name.replace(/^\d+_/, "").replaceAll("_", " ");
}

export function matchWorkbookSheet(section: string, required: string[], used: string[]): string | undefined {
  const words = (value: string) => workbookSheetLabel(value).toLowerCase().replace(/ies\b/g, "y").replace(/s\b/g, "").split(/[^a-z0-9]+/).filter((word) => word.length > 2);
  const sectionWords = words(section);
  return required.filter((name) => !used.includes(name) && !/summary|action_tracker|source_register/i.test(name))
    .map((name) => ({ name, score: words(name).filter((word) => sectionWords.includes(word)).length / Math.max(1, words(name).length) }))
    .filter(({ score }) => score >= 0.5)
    .sort((left, right) => right.score - left.score)[0]?.name;
}

export function uniqueTableHeaders(headers: string[]): string[] {
  const seen = new Set<string>();
  return headers.map((header, index) => {
    const base = header.trim() || `Column ${index + 1}`;
    let name = base;
    let suffix = 2;
    while (seen.has(name.toLowerCase())) name = `${base} ${suffix++}`;
    seen.add(name.toLowerCase());
    return name;
  });
}

export function workbookRowHeight(values: string[], widths: number[]): number {
  const lines = Math.max(1, ...values.map((value, index) => value.split(/\r?\n/).reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / Math.max(8, (widths[index] ?? 30) - 2))), 0)));
  return Math.min(409, Math.max(28, lines * 15 + 12));
}

export function workbookCellValue(value: string, header: string): { value: string | number | Date | null | { text: string; hyperlink: string }; numFmt?: string } {
  const text = value.trim();
  if (!text) return { value: null };
  if (/^https?:\/\/[^\s]+$/.test(text)) return { value: { text, hyperlink: text } };
  if (/date/i.test(header) && /^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const date = new Date(`${text}T00:00:00Z`);
    if (Number.isFinite(date.getTime()) && date.toISOString().startsWith(text)) return { value: date, numFmt: "yyyy-mm-dd" };
  }
  if (/\b(?:id|code|phone|url|zip)\b/i.test(header)) return { value };
  if (/^-?\d+(?:\.\d+)?%$/.test(text)) return { value: Number(text.slice(0, -1)) / 100, numFmt: "0.0%" };
  if (/score|budget|amount|cost|count|volume|clicks|impressions|revenue|duration|words/i.test(header) && /^-?(?:0|[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)(?:\.\d+)?$/.test(text)) {
    return { value: Number(text.replaceAll(",", "")), numFmt: "#,##0.##" };
  }
  return { value };
}
