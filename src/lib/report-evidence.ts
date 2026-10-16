export interface EvidenceFinding {
  id: string;
  text: string;
  sourceNumbers: number[];
  unresolvedNumbers: number[];
  internalNumbers: number[];
}

/** Only explicit inline citations create edges. References are not findings. */
export function extractEvidenceFindings(markdown: string, sourceCount: number): EvidenceFinding[] {
  const findings: EvidenceFinding[] = [];
  let inReferences = false;
  let inCode = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) { inCode = !inCode; continue; }
    if (inCode) continue;
    const heading = line.match(/^#{1,6}\s+(.+)/);
    if (heading) {
      inReferences = /^(references|sources|bibliography|internal sources)\b/i.test(heading[1]);
      continue;
    }
    if (inReferences || !line.trim() || /^\s*\[\d+\]:/.test(line)) continue;
    const matches = [...line.matchAll(/\[(B?\d+(?:\s*,\s*B?\d+)*)\](?!\()/g)];
    if (!matches.length) continue;
    const web = new Set<number>();
    const internal = new Set<number>();
    for (const match of matches) {
      for (const token of match[1].split(/\s*,\s*/)) {
        const number = Number(token.replace(/^B/, ""));
        if (token.startsWith("B")) internal.add(number);
        else web.add(number);
      }
    }
    const text = line.trim().replace(/^[-*>]\s+|^\d+\.\s+/, "");
    if (/^\[\d+\]\s/.test(text)) continue;
    findings.push({
      id: `finding-${findings.length + 1}`,
      text,
      sourceNumbers: [...web].filter((n) => n > 0 && n <= sourceCount),
      unresolvedNumbers: [...web].filter((n) => n < 1 || n > sourceCount),
      internalNumbers: [...internal],
    });
  }
  return findings;
}