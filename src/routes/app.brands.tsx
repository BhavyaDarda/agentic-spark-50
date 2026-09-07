import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getCurrentWorkspace } from "@/lib/workspace.functions";
import { listBrands, createBrand, deleteBrand } from "@/lib/brands.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Building2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { RouteError } from "@/components/route-error";

export const Route = createFileRoute("/app/brands")({
  head: () => ({ meta: [{ title: "Brands · Marketing Agent" }] }),
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: BrandsPage,
});

function BrandsPage() {
  const ws = useQuery({ queryKey: ["current-workspace"], queryFn: () => getCurrentWorkspace() });
  const workspaceId = ws.data?.workspace?.id;
  const qc = useQueryClient();
  const brands = useQuery({
    queryKey: ["brands", workspaceId],
    queryFn: () => listBrands({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    product: "",
    audience: "",
    tone: "",
    goals: "",
    brand_voice: "",
    website: "",
  });

  const create = useMutation({
    mutationFn: async () =>
      createBrand({ data: { workspaceId: workspaceId!, ...form, channels: [] } }),
    onSuccess: () => {
      toast.success("Brand created");
      setOpen(false);
      setForm({
        name: "",
        product: "",
        audience: "",
        tone: "",
        goals: "",
        brand_voice: "",
        website: "",
      });
      qc.invalidateQueries({ queryKey: ["brands", workspaceId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => deleteBrand({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["brands", workspaceId] });
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Brands</h1>
          <p className="text-sm text-muted-foreground">
            Define each brand once — every agent stays on voice.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              New brand
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create brand</DialogTitle>
              <DialogDescription>Just the name to start — fill the rest later.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <Field label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field
                label="Product / service"
                value={form.product}
                onChange={(v) => setForm({ ...form, product: v })}
              />
              <Field
                label="Audience"
                value={form.audience}
                onChange={(v) => setForm({ ...form, audience: v })}
              />
              <Field
                label="Tone (e.g. confident, witty)"
                value={form.tone}
                onChange={(v) => setForm({ ...form, tone: v })}
              />
              <Field
                label="Website"
                value={form.website}
                onChange={(v) => setForm({ ...form, website: v })}
              />
              <div className="space-y-1.5">
                <Label>Brand voice notes</Label>
                <Textarea
                  rows={3}
                  value={form.brand_voice}
                  onChange={(e) => setForm({ ...form, brand_voice: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Goals (this quarter)</Label>
                <Textarea
                  rows={3}
                  value={form.goals}
                  onChange={(e) => setForm({ ...form, goals: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => create.mutate()}
                disabled={!form.name.trim() || create.isPending}
              >
                {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create brand
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {brands.isLoading ? (
        <ListSkeleton count={3} columns={3} lines={3} />
      ) : (brands.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<Building2 className="h-5 w-5" strokeWidth={2.5} />}
          title="No brands yet"
          description="A brand holds your product, audience, tone and goals so every agent speaks in your voice."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add your first brand
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {brands.data!.map((b) => (
            <Card key={b.id} className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{b.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Delete "${b.name}"?`)) del.mutate(b.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                {b.product && <div className="line-clamp-2">{b.product}</div>}
                {b.audience && (
                  <div className="text-xs">
                    <span className="text-muted-foreground/60">Audience:</span> {b.audience}
                  </div>
                )}
                {b.tone && (
                  <div className="text-xs">
                    <span className="text-muted-foreground/60">Tone:</span> {b.tone}
                  </div>
                )}
                <div className="pt-3">
                  <Link
                    to="/app/content"
                    search={{ brand: b.id }}
                    className="text-xs text-primary hover:underline"
                  >
                    Generate content →
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
