import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Copy, Download, Loader2, MapPin, Search, Sparkles, Square } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { GHANA_CITIES } from "@/lib/ghana";
import { seoInputSchema, type SeoEvent } from "@/lib/seo-advisor";

export const Route = createFileRoute("/_authenticated/admin/seo")({
  head: () => ({ meta: [
    { title: "Local SEO Advisor — Salonzee Admin" },
    { name: "description", content: "Ghana-focused SEO recommendations for Salonzee business and directory pages." },
    { property: "og:title", content: "Local SEO Advisor — Salonzee Admin" },
    { property: "og:description", content: "Ghana-focused SEO recommendations for Salonzee business and directory pages." },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://salonzee.com/admin/seo" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ], links: [{ rel: "canonical", href: "https://salonzee.com/admin/seo" }] }),
  component: SeoAdvisorPage,
});

function SeoAdvisorPage() {
  const { session, isPlatformAdmin, loading } = useAuth();
  const [phrase, setPhrase] = useState("");
  const [city, setCity] = useState("Accra");
  const [result, setResult] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [target, setTarget] = useState<{ phrase: string; city: string } | null>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  async function generate(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const input = seoInputSchema.safeParse({ phrase, city });
    if (!input.success) { setError("Enter a search phrase (3–160 characters) and a target city."); return; }
    if (!session) { setError("Please sign in again."); return; }
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true); setResult(""); setReasoning(""); setError(""); setTarget(input.data); setStatus("Preparing recommendations…");
    try {
      const response = await fetch("/api/seo-advisor", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(input.data), signal: controller.signal });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "Recommendations are currently unavailable.");
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response received.");
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;
      const consume = (line: string) => {
        if (!line.trim()) return;
        const part = JSON.parse(line) as SeoEvent;
        if (part.type === "text") { setResult((value) => value + (part.text ?? "")); setStatus("Writing recommendations…"); }
        if (part.type === "reasoning") setReasoning((value) => value + (part.text ?? ""));
        if (part.type === "error") { completed = true; setError(part.text ?? "The request failed."); setStatus("Request ended"); }
        if (part.type === "done") { completed = true; setStatus("Complete"); }
      };
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        lines.forEach(consume);
      }
      buffer += decoder.decode();
      consume(buffer);
      if (!completed) throw new Error("The connection ended early. Partial recommendations are kept below.");
    } catch (caught) {
      if (controller.signal.aborted) setStatus("Stopped — partial recommendations kept");
      else { setError(caught instanceof Error ? caught.message : "Recommendations could not be generated."); setStatus("Request ended"); }
    } finally { setBusy(false); abort.current = null; }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(result); toast.success("Recommendations copied"); }
    catch { toast.error("Could not copy. Please select the text instead."); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([`# Salonzee Local SEO\n\nSearch: ${target?.phrase}\nCity: ${target?.city}\n\n${result}`], { type: "text/markdown" }));
    const link = document.createElement("a"); link.href = url; link.download = "salonzee-local-seo.md"; link.click(); URL.revokeObjectURL(url);
  }

  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!isPlatformAdmin) return <div className="min-h-dvh bg-background"><SiteNav /><main className="mx-auto max-w-4xl px-4 py-16"><h1 className="text-2xl">Admin access required</h1><Button asChild className="mt-6"><Link to="/">Return home</Link></Button></main></div>;

  return <div className="min-h-dvh bg-background">
    <SiteNav />
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Button asChild variant="link" className="mb-5 px-0"><Link to="/admin/analytics"><ArrowLeft />Traffic analytics</Link></Button>
      <div className="flex items-start gap-3 border-b border-border pb-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><Sparkles className="h-6 w-6" /></div>
        <div><p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Salonzee · Ghana</p><h1 className="text-3xl !tracking-normal sm:text-4xl">Local SEO advisor</h1></div>
      </div>
      <form onSubmit={generate} className="border-b border-border py-7">
        <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
          <label className="space-y-2 text-sm font-semibold"><span className="flex items-center gap-2"><Search className="h-4 w-4 text-muted-foreground" />Search phrase</span><input required minLength={3} maxLength={160} disabled={busy} value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="e.g. barbering shop near me" className="h-12 w-full rounded-lg border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring disabled:opacity-60" /></label>
          <label className="space-y-2 text-sm font-semibold"><span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />Target city</span><input required minLength={2} maxLength={80} list="ghana-cities" disabled={busy} value={city} onChange={(e) => setCity(e.target.value)} className="h-12 w-full rounded-lg border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring disabled:opacity-60" /><datalist id="ghana-cities">{GHANA_CITIES.map((name) => <option key={name} value={name} />)}</datalist></label>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          {busy ? <Button type="button" variant="outline" onClick={() => abort.current?.abort()}><Square />Stop</Button> : <Button type="submit"><Sparkles />Generate recommendations</Button>}
          <p className="text-xs text-muted-foreground">AI suggestions · Not live keyword data · Uses workspace AI credits</p>
        </div>
      </form>
      {error && <div role="alert" className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
      {(busy || target) && <div role="status" className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">{busy && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />}{status}</div>}
      {reasoning && <details className="mt-4 text-sm text-muted-foreground"><summary className="cursor-pointer font-medium">Analysis summary</summary><p className="mt-3 whitespace-pre-wrap leading-relaxed">{reasoning}</p></details>}
      {result ? <section className="mt-6" aria-label="SEO recommendations">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4"><div className="min-w-0"><h2 className="break-words text-xl !tracking-normal">{target?.phrase}</h2><p className="mt-1 text-sm text-muted-foreground">{target?.city}, Ghana · Recommendations only</p></div><div className="flex gap-2"><Button variant="outline" size="icon" onClick={copy} title="Copy recommendations" aria-label="Copy recommendations"><Copy /></Button><Button variant="outline" size="icon" onClick={download} title="Download recommendations" aria-label="Download recommendations"><Download /></Button></div></div>
        <div className="max-w-none break-words text-sm leading-7 text-foreground [&_h1]:mb-3 [&_h1]:mt-8 [&_h1]:text-2xl [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-xl [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-base [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_a]:text-primary [&_a]:underline [&_code]:break-all [&_code]:bg-muted [&_code]:px-1 [&_pre]:overflow-auto [&_pre]:bg-muted [&_pre]:p-4 [&_h1]:tracking-normal [&_h2]:tracking-normal [&_h3]:tracking-normal"><ReactMarkdown>{result}</ReactMarkdown></div>
      </section> : !busy && !error && <div className="py-16 text-center"><Search className="mx-auto mb-4 h-9 w-9 text-primary" /><h2 className="text-lg !tracking-normal">Your next local search opportunity</h2><p className="mt-2 text-sm text-muted-foreground">Salon pages · Directory pages · Local keywords</p></div>}
    </main><SiteFooter />
  </div>;
}