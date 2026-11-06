import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { guides } from "@/lib/blog";

export const Route = createFileRoute("/blog")({
  head: () => ({ meta: [
    { title: "Beauty & Business Guides for Ghana — Salonzee" },
    { name: "description", content: "Practical guides to choosing beauty services in Ghana and managing appointments for salons, barbers and nail technicians." },
    { property: "og:title", content: "Beauty & Business Guides for Ghana — Salonzee" },
    { property: "og:description", content: "Customer checklists and business booking guides from Salonzee." },
    { property: "og:url", content: "https://salonzee.com/blog" },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: "https://salonzee.com/blog" }] }),
  component: Blog,
});
function Blog() {
  return <div className="min-h-dvh bg-background"><SiteNav /><div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
    <header className="mb-10 border-b border-border pb-8"><p className="text-sm font-medium text-primary">Salonzee journal</p><h1 className="mt-3 text-4xl sm:text-5xl">Beauty & business guides</h1><p className="mt-4 max-w-2xl text-lg text-muted-foreground">Choosing your next appointment. Making the most of your shop’s day. Practical reading for Ghana’s beauty community.</p></header>
    <div className="grid gap-x-8 gap-y-10 md:grid-cols-2">{guides.map(guide => <article key={guide.slug} className="min-w-0"><Link to="/blog/$slug" params={{ slug: guide.slug }} className="group block"><img src={guide.image} alt={guide.imageAlt} className="aspect-[16/9] w-full rounded-lg object-cover" /><div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span>{guide.audience}</span><time dateTime={guide.date}>6 November 2026</time></div><h2 className="mt-2 text-2xl leading-snug group-hover:text-primary">{guide.title}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{guide.description}</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">Read guide <ArrowUpRight className="h-4 w-4" /></span></Link></article>)}</div>
  </div><SiteFooter /></div>;
}