import "server-only";
import sharp from "sharp";
import { frameworkSvg, type Framework } from "./frameworks";

export async function frameworkImages(framework: Framework) {
  // Keep dense frameworks readable across pages instead of shrinking the
  // entire framework to a single, illegible image.
  const rows = ["swot", "pestel", "tows"].includes(framework.kind) ? 2 : 1;
  const cards = framework.cards.flatMap((card) => {
    const chunks: string[][] = [[]];
    for (const line of card.lines) {
      const pieces = line.match(/[\s\S]{1,900}(?:\s|$)|[\s\S]{1,900}/g) ?? [];
      for (const piece of pieces) {
        if (chunks[chunks.length - 1].join(" ").length + piece.length > 1200 && chunks[chunks.length - 1].length) chunks.push([]);
        chunks[chunks.length - 1].push(piece);
      }
    }
    return chunks.map((lines, index) => ({ title: `${card.title}${index ? " (continued)" : ""}`, lines }));
  });
  const groups: Framework[] = [];
  let current: Framework = { ...framework, cards: [] };
  for (let index = 0; index < cards.length; index += rows) {
    const next = cards.slice(index, index + rows);
    const candidate = { ...framework, cards: [...current.cards, ...next] };
    if (current.cards.length && frameworkSvg(candidate).height > 1000) {
      groups.push(current);
      current = { ...framework, cards: next };
    } else current = candidate;
  }
  if (current.cards.length) groups.push(current);
  return Promise.all(groups.map(async (group) => {
    const { svg, width, height } = frameworkSvg(group);
    return { data: await sharp(Buffer.from(svg), { density: 144 }).png().toBuffer(), width, height };
  }));
}
