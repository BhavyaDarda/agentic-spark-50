import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { SponsorUnit } from "@/components/sponsor-unit";
import { X, Plus, Loader2 } from "lucide-react";
import type { SponsorAdminRow } from "@/lib/sponsors.server";

export interface SponsorDraft {
  id?: string;
  name: string;
  tagline: string;
  body: string;
  ctaLabel: string;
  destinationUrl: string;
  logoUrl: string;
  topicKeywords: string[];
  creditLines: string[];
  weight: number;
  isActive: boolean;
}

export function emptyDraft(): SponsorDraft {
  return {
    name: "",
    tagline: "",
    body: "",
    ctaLabel: "Take a look",
    destinationUrl: "",
    logoUrl: "",
    topicKeywords: [],
    creditLines: [],
    weight: 10,
    isActive: true,
  };
}

export function draftFrom(row: SponsorAdminRow): SponsorDraft {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    body: row.body ?? "",
    ctaLabel: row.ctaLabel,
    destinationUrl: row.destinationUrl,
    logoUrl: row.logoUrl ?? "",
    topicKeywords: row.topicKeywords,
    creditLines: row.creditLines,
    weight: row.weight,
    isActive: row.isActive,
  };
}

/**
 * Sponsor editor. Everything a sponsor can ever say lives in these fields —
 * there is no script tag, no embed, no third-party creative. The preview on the
 * right is the exact component readers see on a public report.
 */
export function SponsorForm({
  draft,
  onChange,
  onSubmit,
  onCancel,
  saving,
}: {
  draft: SponsorDraft;
  onChange: (next: SponsorDraft) => void;
  onSubmit: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [keyword, setKeyword] = useState("");
  const set = <K extends keyof SponsorDraft>(key: K, value: SponsorDraft[K]) =>
    onChange({ ...draft, [key]: value });

  const addKeyword = () => {
    const k = keyword.trim().toLowerCase();
    if (k.length < 2 || draft.topicKeywords.includes(k)) return;
    set("topicKeywords", [...draft.topicKeywords, k]);
    setKeyword("");
  };

  const valid =
    draft.name.trim().length > 0 &&
    draft.tagline.trim().length > 0 &&
    draft.ctaLabel.trim().length > 0 &&
    /^https?:\/\/\S+$/.test(draft.destinationUrl.trim());

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sponsor name">
            <Input value={draft.name} onChange={(e) => set("name", e.target.value)} maxLength={80} />
          </Field>
          <Field label="CTA label">
            <Input
              value={draft.ctaLabel}
              onChange={(e) => set("ctaLabel", e.target.value)}
              maxLength={40}
            />
          </Field>
        </div>

        <Field label="Tagline" hint="One line. Read directly beside the findings.">
          <Input
            value={draft.tagline}
            onChange={(e) => set("tagline", e.target.value)}
            maxLength={160}
          />
        </Field>

        <Field label="Body" hint="Optional. Two short sentences at most.">
          <Textarea
            value={draft.body}
            onChange={(e) => set("body", e.target.value)}
            maxLength={400}
            rows={3}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Destination URL">
            <Input
              value={draft.destinationUrl}
              onChange={(e) => set("destinationUrl", e.target.value)}
              placeholder="https://"
            />
          </Field>
          <Field label="Logo URL" hint="Optional, square works best.">
            <Input
              value={draft.logoUrl}
              onChange={(e) => set("logoUrl", e.target.value)}
              placeholder="https://"
            />
          </Field>
        </div>

        <Field
          label="Topic keywords"
          hint="A card only shows on reports whose topic matches one of these. No keywords = house sponsor, eligible everywhere at lowest priority."
        >
          <div className="flex gap-2">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addKeyword();
                }
              }}
              placeholder="developer tooling"
            />
            <Button type="button" variant="outline" size="icon" onClick={addKeyword}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {draft.topicKeywords.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {draft.topicKeywords.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() =>
                    set(
                      "topicKeywords",
                      draft.topicKeywords.filter((x) => x !== k),
                    )
                  }
                  className="brut-chip brut-chip-accent cursor-pointer"
                >
                  {k}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}
        </Field>

        <Field
          label="Credit lines"
          hint="Our voice, not theirs. One is picked at random per render. Use {name} for the sponsor name. Leave empty to use the house lines."
        >
          <div className="space-y-2">
            {draft.creditLines.map((line, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={line}
                  maxLength={240}
                  onChange={(e) => {
                    const next = [...draft.creditLines];
                    next[i] = e.target.value;
                    set("creditLines", next);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    set(
                      "creditLines",
                      draft.creditLines.filter((_, j) => j !== i),
                    )
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {draft.creditLines.length < 10 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => set("creditLines", [...draft.creditLines, ""])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add line
              </Button>
            )}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`Rotation weight — ${draft.weight}`} hint="Higher wins more often inside a tier.">
            <Slider
              value={[draft.weight]}
              min={1}
              max={100}
              step={1}
              onValueChange={([v]) => set("weight", v ?? 1)}
            />
          </Field>
          <div className="flex items-end gap-3">
            <Switch checked={draft.isActive} onCheckedChange={(v) => set("isActive", v)} />
            <span className="pb-1 font-mono text-xs uppercase tracking-widest">
              {draft.isActive ? "live" : "paused"}
            </span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={onSubmit} disabled={!valid || saving}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {draft.id ? "Save sponsor" : "Create sponsor"}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>

      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Exactly what readers see
        </p>
        <SponsorUnit
          preview
          sponsor={{
            id: draft.id ?? "preview",
            name: draft.name || "Sponsor name",
            tagline: draft.tagline || "One honest line about the product.",
            body: draft.body || null,
            ctaLabel: draft.ctaLabel || "Take a look",
            destinationUrl: draft.destinationUrl || "https://example.com",
            logoUrl: draft.logoUrl || null,
            creditLine: (draft.creditLines.find((l) => l.trim()) ?? "").replaceAll(
              "{name}",
              draft.name || "Sponsor name",
            ) ||
              `${draft.name || "Sponsor name"} covered the compute so this page could stay free.`,
          }}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}
