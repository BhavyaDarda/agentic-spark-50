import { describe, expect, test } from "bun:test";
import { extractEvidenceFindings } from "./report-evidence";

describe("explicit evidence links", () => {
  test("maps exact citations and deduplicates without inventing links", () => {
    const [finding] = extractEvidenceFindings("- A claim [1] [2, 1] [B1] [99].", 2);
    expect(finding?.sourceNumbers).toEqual([1, 2]);
    expect(finding?.unresolvedNumbers).toEqual([99]);
    expect(finding?.internalNumbers).toEqual([1]);
  });
  test("excludes reference lists, code, link labels, and uncited prose", () => {
    const text = "Uncited statement.\n[1](https://example.com)\n```\nCode [1]\n```\n## References\n[1] Source — https://example.com\n## Key findings\nActual claim [1]";
    expect(extractEvidenceFindings(text, 1).map((f) => f.text)).toEqual(["Actual claim [1]"]);
  });
  test("does not map unavailable internal documents onto public sources", () => {
    const [finding] = extractEvidenceFindings("Internal claim [B2].", 3);
    expect(finding?.sourceNumbers).toEqual([]);
    expect(finding?.internalNumbers).toEqual([2]);
  });
  test("handles empty reports and invalid citation numbers", () => {
    expect(extractEvidenceFindings("", 0)).toEqual([]);
    expect(extractEvidenceFindings("Claim [0] [3]", 0)[0]?.unresolvedNumbers).toEqual([0, 3]);
  });
});