export type Framework = { kind: "swot" | "pestel" | "tows" | "funnel" | "journey" | "roadmap" | "priority" | "comparison"; cards: { title: string; lines: string[] }[] };

const categories = {
  swot: ["Strengths", "Weaknesses", "Opportunities", "Threats"],
  pestel: ["Political", "Economic", "Social", "Technological", "Environmental", "Legal"],
  tows: ["SO", "WO", "ST", "WT"],
};
const plain = (text: string) => text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)").replace(/[*`_]/g, "").replace(/<br\s*\/?\s*>/gi, "; ").trim();
const heading = (line: string) => line.match(/^(#{1,6})\s+(.+)$/);
function kindFor(text: string): Framework["kind"] | undefined {
  if (/\bSWOT\b/i.test(text)) return "swot";
  if (/\bPEST(?:EL|LE)\b/i.test(text)) return "pestel";
  if (/\bTOWS\b/i.test(text)) return "tows";
  if (/\bfunnel\b/i.test(text)) return "funnel";
  if (/\b(?:customer|buyer|user) journey\b/i.test(text)) return "journey";
  if (/\broadmap\b|30\s*[/–-]\s*60\s*[/–-]\s*90/i.test(text)) return "roadmap";
  if (/\b(?:impact\s*(?:vs\.?|and)\s*effort|prioriti[sz]ation|priority matrix|decision matrix)\b/i.test(text)) return "priority";
  if (/\b(?:competitive|feature|vendor|market) comparison\b|\bpositioning matrix\b/i.test(text)) return "comparison";
}
function categoryFor(text: string, kind: Framework["kind"]): string | undefined {
  const label = plain(text).replace(/^\d+[.)]\s*/, "");
  if (kind === "swot") return categories.swot.find((name) => new RegExp(`\\b${name}\\b`, "i").test(label));
  if (kind === "pestel") {
    if (/\bsoci(?:al|ocultural|o-cultural)\b/i.test(label)) return "Social";
    if (/\btechnolog(?:y|ical)\b/i.test(label)) return "Technological";
    return categories.pestel.find((name) => new RegExp(`\\b${name}\\b`, "i").test(label));
  }
  if (kind === "tows") return categories.tows.find((name) => new RegExp(`\\b${name}\\b`, "i").test(label));
  return undefined;
}
function splitRow(line: string): string[] {
  return line.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((cell) => plain(cell.replace(/\\\|/g, "|")));
}
function fromTable(rows: string[][], kind: Framework["kind"]): Framework | undefined {
  const [headers, ...body] = rows;
  if (!body.length) return;
  const fixed = kind in categories;
  const columns = headers.map((title) => categoryFor(title, kind));
  if (fixed && columns.every(Boolean)) {
    return { kind, cards: columns.map((title, index) => ({ title: title!, lines: body.map((row) => row[index] ?? "").filter(Boolean) })) };
  }
  const categoryIndex = fixed ? headers.findIndex((_, index) => body.every((row) => categoryFor(row[index] ?? "", kind))) : 0;
  const firstColumnSupportsKind = kind === "funnel" || kind === "journey" || kind === "roadmap"
    ? /stage|phase|period|day|step|touchpoint/i.test(headers[0])
    : /dimension|option|initiative|competitor|vendor|segment|quadrant|axis|priority/i.test(headers[0]);
  if (categoryIndex < 0 || (!fixed && !firstColumnSupportsKind)) return;
  const cards: Framework["cards"] = [];
  for (const row of body) {
    const title = fixed ? categoryFor(row[categoryIndex] ?? "", kind)! : row[categoryIndex];
    if (!title) return;
    const lines = row.flatMap((cell, index) => index === categoryIndex || !cell ? [] : [`${headers[index] || "Details"}: ${cell}`]);
    const existing = cards.find((card) => card.title === title);
    if (existing) existing.lines.push(...lines);
    else cards.push({ title, lines });
  }
  if (fixed) {
    const order = categories[kind as keyof typeof categories];
    cards.sort((a, b) => order.indexOf(a.title) - order.indexOf(b.title));
  }
  return cards.length >= 2 ? { kind, cards } : undefined;
}
const encode = (framework: Framework) => ["```framework", JSON.stringify(framework), "```"].join("\n");

// Turn recognizable, existing report structures into visuals without asking
// the model to regenerate evidence or supply unsupported numeric values.
export function prepareFrameworks(markdown: string): string {
  const lines = markdown.split("\n");
  const result: string[] = [];
  let active: { kind: Framework["kind"]; level: number } | undefined;
  let fence: string | undefined;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = line.trim().match(/^(`{3,}|~{3,})/);
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1];
      else if (fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = undefined;
      result.push(line); continue;
    }
    if (fence) { result.push(line); continue; }
    const h = heading(line);
    if (h) {
      if (active && h[1].length <= active.level) active = undefined;
      const kind = kindFor(h[2]);
      if (kind) active = { kind, level: h[1].length };
    }
    if (active && line.includes("|") && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1] ?? "")) {
      const rows = [splitRow(line)];
      let end = i + 2;
      while (end < lines.length && lines[end].includes("|") && lines[end].trim()) rows.push(splitRow(lines[end++]));
      const framework = fromTable(rows, active.kind);
      if (framework) { result.push(encode(framework)); i = end - 1; continue; }
    }
    // Also support SWOT / PESTEL written as category subheadings and bullets.
    if (active && h && h[1].length > active.level && categoryFor(h[2], active.kind)) {
      const cards: Framework["cards"] = [];
      let end = i;
      while (end < lines.length) {
        const next = heading(lines[end]);
        const title = next && next[1].length === h[1].length ? categoryFor(next[2], active.kind) : undefined;
        if (!title) break;
        const body: string[] = [];
        end++;
        while (end < lines.length && !heading(lines[end])) body.push(lines[end++]);
        // Complex nested tables and code retain their original Markdown.
        if (body.some((item) => /\||^\s*(```|~~~)/.test(item))) break;
        cards.push({ title, lines: body.map((item) => plain(item.replace(/^\s*[-+]\s+/, ""))).filter(Boolean) });
      }
      if (cards.length >= 2 && cards.every((card) => card.lines.length)) {
        result.push(encode({ kind: active.kind, cards }));
        // Only consume the recognized cards, not a following complex section.
        let consumed = i;
        for (let count = 0; count < cards.length; count++) {
          consumed++;
          while (consumed < lines.length && !heading(lines[consumed])) consumed++;
        }
        i = consumed - 1; continue;
      }
    }
    result.push(line);
  }
  return result.join("\n");
}

export function readFramework(text: string): Framework | undefined {
  try {
    const value = JSON.parse(text) as Framework;
    if (!["swot", "pestel", "tows", "funnel", "journey", "roadmap", "priority", "comparison"].includes(value.kind) || !Array.isArray(value.cards) || value.cards.length < 2 || value.cards.length > 30) return;
    if (!value.cards.every((card) => typeof card.title === "string" && Array.isArray(card.lines) && card.lines.every((line) => typeof line === "string"))) return;
    return value;
  } catch { return; }
}

const escapeXml = (value: string) => value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!);
function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/).flatMap((word) => word.match(new RegExp(`.{1,${max}}`, "gu")) ?? []);
  const lines: string[] = [];
  for (const word of words) {
    if (!lines.length || lines[lines.length - 1].length + word.length + 1 > max) lines.push(word);
    else lines[lines.length - 1] += ` ${word}`;
  }
  return lines;
}

// Pure SVG is shared by the app and both export formats. Text wraps explicitly
// so labels cannot overlap or depend on browser-only foreignObject rendering.
export function frameworkSvg(framework: Framework): { svg: string; width: number; height: number } {
  const width = 960;
  const staged = ["funnel", "journey", "roadmap"].includes(framework.kind);
  const columns = staged ? 1 : 2;
  const gap = 18;
  const cardWidth = (width - gap * (columns + 1)) / columns;
  const palette = ["#7C34BC", "#B74162", "#167C70", "#AD7024", "#3C65A5", "#6853A3"];
  const parts: string[] = [];
  let y = 18;
  for (let row = 0; row < framework.cards.length; row += columns) {
    const items = framework.cards.slice(row, row + columns).map((card, offset) => {
      const index = row + offset;
      const inset = framework.kind === "funnel" ? Math.min(index * 34, 150) : 0;
      const w = cardWidth - inset * 2;
      const titles = wrap(card.title, Math.floor((w - 54) / 12));
      const lines = card.lines.flatMap((line) => [...wrap(line, Math.floor((w - 54) / 9)), ""]);
      return { card, index, inset, w, titles, lines, height: Math.max(130, 42 + titles.length * 28 + lines.length * 23) };
    });
    const height = Math.max(...items.map((item) => item.height));
    for (const item of items) {
      const x = gap + (item.index % columns) * (cardWidth + gap) + item.inset;
      const color = palette[item.index % palette.length];
      parts.push(`<rect x="${x}" y="${y}" width="${item.w}" height="${height}" rx="14" fill="#FCFAFE" stroke="#DDD3E6"/><rect x="${x}" y="${y + 14}" width="5" height="${height - 28}" rx="2" fill="${color}"/>`);
      item.titles.forEach((line, index) => parts.push(`<text x="${x + 24}" y="${y + 36 + index * 28}" font-size="22" font-weight="700" fill="${color}">${escapeXml(line)}</text>`));
      item.lines.forEach((line, index) => parts.push(`<text x="${x + 24}" y="${y + 44 + item.titles.length * 28 + index * 23}" font-size="16" fill="#393440">${escapeXml(line)}</text>`));
    }
    y += height + gap;
    if (staged && row + columns < framework.cards.length) {
      parts.push(`<path d="M480 ${y - 12} v16 m-5 -5 5 5 5 -5" stroke="#A99AB5" stroke-width="2" fill="none"/>`);
      y += 12;
    }
  }
  if (framework.kind === "funnel") {
    parts.push(`<text x="18" y="${y + 10}" font-size="14" fill="#71667B">Stage widths show sequence, not measured volume or conversion.</text>`);
    y += 30;
  }
  return { width, height: y, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${y}" viewBox="0 0 ${width} ${y}" role="img" font-family="Arial, sans-serif"><title>${escapeXml(framework.kind.toUpperCase())} framework</title><rect width="100%" height="100%" fill="white"/>${parts.join("")}</svg>` };
}
