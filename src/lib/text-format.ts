const ACRONYMS = ["SEO", "GEO", "ICP", "PESTEL", "SWOT", "ROI", "KPI", "CTR", "CTA", "AI", "API", "URL", "B2B"] as const;
const URL_PATTERN = /(https?:\/\/[^\s)\]>]+)/gi;

export function normalizeAcronyms(value: string): string {
  return value.split(URL_PATTERN).map((part) => /^https?:\/\//i.test(part) ? part : ACRONYMS.reduce((text, acronym) => text.replace(new RegExp(`\\b${acronym}\\b`, "gi"), acronym), part)).join("");
}

function contentFromValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const extracted = contentFromValue(item);
      if (extracted) return extracted;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const key of [
    "contentMarkdown",
    "recommendedResponse",
    "draftContent",
    "evidence",
    "description",
    "content",
    "text",
    "summary",
    "whatHappened",
    "whyMatters",
    "action",
    "impact",
  ]) {
    if (typeof record[key] === "string" && record[key].trim()) return record[key] as string;
  }
  return null;
}

export function cleanRawJsonArtifacts(text: string): string {
  if (!text || typeof text !== "string") return "";

  let cleaned = text;

  // Strip trailing raw JSON properties starting with quote-comma or unescaped comma-quote
  // e.g. '","tags":[],"competitiveAttributes":...' or '", "companyName": ...'
  const jsonBoundaryRegex = /"\s*,\s*"(?:tags|competitiveAttributes|companyName|officialWebsite|logoUrl|sourceRegister|sourceUrls|priority|confidence|kind|platform|publishedAt|title|evidence|description|impact|action)"\s*:\s*[\s\S]*$/i;
  cleaned = cleaned.replace(jsonBoundaryRegex, "");

  // Generic fallback for trailing '","anyKey":'
  const genericPropertyBoundary = /"\s*,\s*"[a-zA-Z0-9_]+"\s*:\s*[\s\S]*$/;
  cleaned = cleaned.replace(genericPropertyBoundary, "");

  // Remove trailing quotes, braces, brackets or commas left over from truncated JSON
  cleaned = cleaned.replace(/["}\]\s,]+$/, "").trim();

  // Handle unescape sequences if raw backslashes remain
  cleaned = cleaned.replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\t/g, "\t");

  return cleaned.trim();
}

function getUnescapedPipeIndices(str: string): number[] {
  const indices: number[] = [];
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "|") {
      let backslashes = 0;
      for (let j = i - 1; j >= 0 && str[j] === "\\"; j--) {
        backslashes++;
      }
      if (backslashes % 2 === 0) {
        indices.push(i);
      }
    }
  }
  return indices;
}

export function fixMarkdownTables(raw: string): string {
  if (!raw || typeof raw !== "string" || !raw.includes("|")) return raw;

  const separatorRegex = /\|(?:\s*:?-{2,}:?\s*\|)+/g;

  let match: RegExpExecArray | null;
  let result = raw;

  while ((match = separatorRegex.exec(result)) !== null) {
    const separatorStr = match[0].trim();
    const separatorIndex = match.index;

    const numPipes = getUnescapedPipeIndices(separatorStr).length;
    if (numPipes < 2) continue;

    const beforeSeparator = result.slice(0, separatorIndex);
    const pipeIndicesBefore = getUnescapedPipeIndices(beforeSeparator);

    if (pipeIndicesBefore.length < numPipes) {
      continue;
    }

    const headerStartPipeIndex = pipeIndicesBefore[pipeIndicesBefore.length - numPipes];
    const lastHeaderPipeIndex = pipeIndicesBefore[pipeIndicesBefore.length - 1];

    const headerRowStr = beforeSeparator.slice(headerStartPipeIndex, lastHeaderPipeIndex + 1).trim();
    if (headerRowStr.includes("\n")) {
      continue;
    }

    const textBetweenHeaderAndSep = beforeSeparator.slice(lastHeaderPipeIndex + 1);
    if (textBetweenHeaderAndSep.trim() !== "" || /\n\s*\r?\n/.test(textBetweenHeaderAndSep)) {
      continue;
    }

    const preTableText = beforeSeparator.slice(0, headerStartPipeIndex).trimEnd();

    const afterSeparatorIndex = separatorIndex + match[0].length;
    const restOfText = result.slice(afterSeparatorIndex);

    const dataRows: string[] = [];
    let currentOffset = 0;

    while (currentOffset < restOfText.length) {
      const sub = restOfText.slice(currentOffset);
      const pipeIndicesInSub = getUnescapedPipeIndices(sub);

      if (pipeIndicesInSub.length < numPipes) {
        break;
      }

      const textBeforeFirstPipe = sub.slice(0, pipeIndicesInSub[0]);
      if (textBeforeFirstPipe.trim() !== "" || /\n\s*\r?\n/.test(textBeforeFirstPipe)) {
        break;
      }

      const endPipeIndex = pipeIndicesInSub[numPipes - 1];
      const rowStr = sub.slice(pipeIndicesInSub[0], endPipeIndex + 1).trim();
      if (rowStr.includes("\n")) {
        break;
      }

      dataRows.push(rowStr);
      currentOffset += endPipeIndex + 1;
    }

    const postTableText = restOfText.slice(currentOffset).trimStart();

    const formattedTableBlock = [headerRowStr, separatorStr, ...dataRows].join("\n");
    const newPrefix = preTableText ? `${preTableText}\n\n` : "";
    const newSuffix = postTableText ? `\n\n${postTableText}` : "";

    const replacement = `${newPrefix}${formattedTableBlock}${newSuffix}`;
    result = replacement;
    separatorRegex.lastIndex = (newPrefix + formattedTableBlock).length;
  }

  return result;
}

export function unwrapStructuredText(input: unknown): string {
  if (input === null || input === undefined) return "";
  if (typeof input !== "string") {
    const fromVal = contentFromValue(input);
    return fixMarkdownTables(cleanRawJsonArtifacts(normalizeAcronyms(fromVal ?? "")));
  }

  let value = input.trim().replace(/^```(?:json|markdown|md)?\s*/i, "").replace(/\s*```$/, "");
  for (let pass = 0; pass < 3; pass += 1) {
    const firstBrace = value.indexOf("{");
    const candidates = [value, firstBrace > 0 ? value.slice(firstBrace) : ""].filter(Boolean);
    let extracted: string | null = null;
    for (const candidate of candidates) {
      try { extracted = contentFromValue(JSON.parse(candidate)); } catch { /* Try the encoded-field fallback. */ }
      if (extracted) break;
    }
    if (!extracted) {
      const encoded = value.match(/"contentMarkdown"\s*:\s*("(?:\\.|[^"\\])*")/)?.[1];
      if (encoded) {
        try { extracted = JSON.parse(encoded) as string; } catch { /* Keep the original text. */ }
      }
    }
    if (!extracted) {
      const marker = value.match(/"(?:contentMarkdown|recommendedResponse|draftContent|evidence|description|content|text|summary|whatHappened|whyMatters)"\s*:\s*"?/i);
      if (marker?.index !== undefined) {
        let rest = value.slice(marker.index + marker[0].length);
        const closingQuoteMatch = rest.match(/"\s*(?:,|\}|\r?\n|$)/);
        if (closingQuoteMatch?.index !== undefined) {
          rest = rest.slice(0, closingQuoteMatch.index);
        }
        extracted = rest.replace(/"\s*}\s*$/, "").replace(/\\"/g, '"').replace(/\\r?\\n/g, "\n").trim();
      }
    }
    if (!extracted || extracted === value) break;
    value = extracted.trim().replace(/^```(?:json|markdown|md)?\s*/i, "").replace(/\s*```$/, "");
  }

  const cleaned = cleanRawJsonArtifacts(value.replace(/\\n/g, "\n").replace(/\\t/g, "\t").trim());
  return fixMarkdownTables(normalizeAcronyms(cleaned));
}
