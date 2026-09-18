import { normalizeDocumentMarkdown, parseMarkdown, type DocumentBlock } from "./content";
import { prepareFrameworks, readFramework, type Framework } from "./frameworks";

export type VisualDocumentBlock = DocumentBlock | { type: "framework"; framework: Framework };

// Artifact data models keep their original tables; visual exports opt in to
// framework composition without changing spreadsheet and slide semantics.
export function parseVisualMarkdown(markdown: string): VisualDocumentBlock[] {
  const prepared = prepareFrameworks(normalizeDocumentMarkdown(markdown));
  const blocks: VisualDocumentBlock[] = [];
  const pattern = /^```framework\n([\s\S]*?)\n```\s*$/gm;
  let end = 0;
  for (const match of prepared.matchAll(pattern)) {
    blocks.push(...parseMarkdown(prepared.slice(end, match.index)));
    const framework = readFramework(match[1]);
    if (framework) blocks.push({ type: "framework", framework });
    else blocks.push(...parseMarkdown(match[0]));
    end = match.index! + match[0].length;
  }
  blocks.push(...parseMarkdown(prepared.slice(end)));
  return blocks;
}
