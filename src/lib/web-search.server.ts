// Server-only live web search shared by the chat orchestrator, Research Ninja
// and the citation sweep.
//
// Two real providers, tried in order:
//   1. Tavily            — dedicated search API (TAVILY_API_KEY).
//   2. Claude web search — Anthropic's native `web_search` tool, reached through
//                          the Lovable AI Gateway with the project's own key.
//                          No third-party key needed.
//
// If both are unavailable the caller gets `{ ok: false }` and must say so.
// There is deliberately no HTML scraping of a search engine and no "answer
// from memory and pretend it was searched" path: every result here came back
// from a real query executed moments ago.
//
// Never import this file from client code.
import { getLovableApiKey } from "@/lib/ai-gateway.server";

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  /** Publication date when the provider knows it (free text, e.g. "May 21, 2026"). */
  publishedAt: string | null;
}

export type SearchProvider = "tavily" | "claude";

export type SearchOutcome =
  | { ok: true; provider: SearchProvider; results: SearchResult[] }
  | { ok: false; provider: null; results: SearchResult[]; error: string };

export interface SearchOptions {
  max?: number;
  depth?: "basic" | "advanced";
  /** Abort after this many milliseconds. */
  timeoutMs?: number;
}

const GATEWAY_MESSAGES_URL = "https://ai.gateway.lovable.dev/v1/messages";
/** Cheapest search-capable model on the gateway; it only relays the query. */
const SEARCH_RELAY_MODEL = "anthropic/claude-haiku-4-5";

function dedupe(results: SearchResult[], max: number): SearchResult[] {
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const r of results) {
    if (!r.url.startsWith("http")) continue;
    const key = r.url.replace(/[#?].*$/, "").replace(/\/$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
    if (out.length >= max) break;
  }
  return out;
}

// ------------------------------------------------------------------ Tavily

async function tavilySearch(query: string, opts: SearchOptions): Promise<SearchOutcome> {
  const key = process.env["TAVILY_API_KEY"];
  if (!key) return { ok: false, provider: null, results: [], error: "tavily_not_configured" };
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        query,
        max_results: opts.max ?? 6,
        search_depth: opts.depth ?? "basic",
        include_answer: false,
        include_raw_content: false,
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
    });
    if (!res.ok) {
      return { ok: false, provider: null, results: [], error: `tavily_${res.status}` };
    }
    const json = (await res.json()) as {
      results?: { url: string; title?: string; content?: string; published_date?: string }[];
    };
    const results = dedupe(
      (json.results ?? []).map((r) => ({
        url: r.url,
        title: (r.title ?? "").trim(),
        snippet: (r.content ?? "").trim(),
        publishedAt: r.published_date ?? null,
      })),
      opts.max ?? 6,
    );
    return { ok: true, provider: "tavily", results };
  } catch (e) {
    return {
      ok: false,
      provider: null,
      results: [],
      error: e instanceof Error ? e.message : "tavily_failed",
    };
  }
}

// ------------------------------------------------------- Claude web search

interface AnthropicTextBlock {
  type: "text";
  text: string;
  citations?: { type: string; url?: string; title?: string; cited_text?: string }[];
}
interface AnthropicSearchResult {
  type: "web_search_result";
  url: string;
  title?: string;
  page_age?: string | null;
}
interface AnthropicSearchToolResult {
  type: "web_search_tool_result";
  content: AnthropicSearchResult[] | { type: string; error_code?: string };
}
type AnthropicBlock =
  | AnthropicTextBlock
  | AnthropicSearchToolResult
  | { type: "server_tool_use"; name: string; input: unknown }
  | { type: string };

interface AnthropicMessage {
  content: AnthropicBlock[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    server_tool_use?: { web_search_requests?: number };
  };
  stop_reason?: string;
}

async function anthropicMessages(
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<AnthropicMessage> {
  const res = await fetch(GATEWAY_MESSAGES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": getLovableApiKey(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`gateway_${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as AnthropicMessage;
}

function collectSearchResults(message: AnthropicMessage): SearchResult[] {
  const citedText = new Map<string, string>();
  for (const block of message.content) {
    if (block.type === "text") {
      for (const c of (block as AnthropicTextBlock).citations ?? []) {
        if (c.url && c.cited_text && !citedText.has(c.url)) citedText.set(c.url, c.cited_text);
      }
    }
  }
  const out: SearchResult[] = [];
  for (const block of message.content) {
    if (block.type !== "web_search_tool_result") continue;
    const content = (block as AnthropicSearchToolResult).content;
    if (!Array.isArray(content)) continue;
    for (const r of content) {
      if (r.type !== "web_search_result" || !r.url) continue;
      out.push({
        url: r.url,
        title: (r.title ?? "").trim(),
        snippet: (citedText.get(r.url) ?? "").trim(),
        publishedAt: r.page_age ?? null,
      });
    }
  }
  return out;
}

async function claudeSearch(query: string, opts: SearchOptions): Promise<SearchOutcome> {
  try {
    const message = await anthropicMessages(
      {
        model: SEARCH_RELAY_MODEL,
        max_tokens: 400,
        system:
          "You are a search relay. Call the web_search tool exactly once with the user's text as the query, verbatim. Then reply with the single word DONE. Do not summarize.",
        messages: [{ role: "user", content: query }],
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 1 }],
      },
      opts.timeoutMs ?? 40_000,
    );
    const results = dedupe(collectSearchResults(message), opts.max ?? 6);
    if (results.length === 0) {
      const errored = message.content.find(
        (b) =>
          b.type === "web_search_tool_result" &&
          !Array.isArray((b as AnthropicSearchToolResult).content),
      ) as AnthropicSearchToolResult | undefined;
      const code =
        errored && !Array.isArray(errored.content) ? errored.content.error_code : undefined;
      if (code) return { ok: false, provider: null, results: [], error: `claude_${code}` };
    }
    return { ok: true, provider: "claude", results };
  } catch (e) {
    return {
      ok: false,
      provider: null,
      results: [],
      error: e instanceof Error ? e.message : "claude_search_failed",
    };
  }
}

// ---------------------------------------------------------------- Public API

/**
 * Run one live web search. Tries Tavily first, then Claude's native search.
 * Returns `ok: false` only when every real provider failed.
 */
export async function webSearch(query: string, opts: SearchOptions = {}): Promise<SearchOutcome> {
  const q = query.trim().slice(0, 400);
  if (!q) return { ok: false, provider: null, results: [], error: "empty_query" };

  const first = await tavilySearch(q, opts);
  if (first.ok && first.results.length > 0) return first;

  const second = await claudeSearch(q, opts);
  if (second.ok) return second;

  return {
    ok: false,
    provider: null,
    results: [],
    error: `${first.error ?? "tavily_failed"} / ${second.error}`,
  };
}

export interface GroundedAnswer {
  ok: boolean;
  text: string;
  /** URLs the model explicitly cited in its answer. */
  citedUrls: string[];
  /** Every URL the search tool surfaced while answering. */
  searchedUrls: string[];
  searchRequests: number;
  error?: string;
}

/**
 * Ask a search-grounded model a question and report which URLs it actually
 * cited. Used by the citation sweep to measure whether a published report is
 * being picked up by an answer engine — the model really searched, so a hit
 * is a real observation, not a guess.
 */
export async function groundedAnswer(
  question: string,
  opts: { maxSearches?: number; timeoutMs?: number } = {},
): Promise<GroundedAnswer> {
  try {
    const message = await anthropicMessages(
      {
        model: SEARCH_RELAY_MODEL,
        max_tokens: 900,
        system:
          "Answer the user's question using web search. Search before answering and cite the pages you rely on. Keep the answer under 200 words.",
        messages: [{ role: "user", content: question }],
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: Math.max(1, Math.min(opts.maxSearches ?? 3, 5)),
          },
        ],
      },
      opts.timeoutMs ?? 60_000,
    );
    const cited = new Set<string>();
    let text = "";
    for (const block of message.content) {
      if (block.type !== "text") continue;
      const tb = block as AnthropicTextBlock;
      text += tb.text;
      for (const c of tb.citations ?? []) if (c.url) cited.add(c.url);
    }
    const searched = collectSearchResults(message).map((r) => r.url);
    return {
      ok: true,
      text,
      citedUrls: [...cited],
      searchedUrls: [...new Set(searched)],
      searchRequests: message.usage?.server_tool_use?.web_search_requests ?? 0,
    };
  } catch (e) {
    return {
      ok: false,
      text: "",
      citedUrls: [],
      searchedUrls: [],
      searchRequests: 0,
      error: e instanceof Error ? e.message : "grounded_answer_failed",
    };
  }
}

/** Shared page reader: SSRF-guarded fetch + tag stripping. */
export async function readPage(
  url: string,
  maxChars = 12_000,
): Promise<{ ok: true; text: string; title: string } | { ok: false; text: ""; title: "" }> {
  try {
    const { safeFetch } = await import("@/lib/ssrf.server");
    const res = await safeFetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MarketingAgentResearch/2.0; +https://reacher-ai.lovable.app)",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ok: false, text: "", title: "" };
    const type = res.headers.get("content-type") ?? "";
    if (!/text\/|xml|json/.test(type)) return { ok: false, text: "", title: "" };
    const html = await res.text();
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxChars);
    if (text.length < 80) return { ok: false, text: "", title: "" };
    return { ok: true, text, title: title.replace(/\s+/g, " ") };
  } catch {
    return { ok: false, text: "", title: "" };
  }
}
