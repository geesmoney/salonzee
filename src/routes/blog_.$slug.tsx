import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getGuide, guides } from "@/lib/blog";

export const Route = createFileRoute("/blog_/$slug")({
  loader: ({ params }) => { const guide = getGuide(params.slug); if (!guide) throw notFound(); return guide; },
  head: ({ loaderData: guide }) => guide ? ({ meta: [
    { title: `${guide.title} — Salonzee` }, { name: "description", content: guide.description },
    { property: "og:title", content: `${guide.title} — Salonzee` }, { property: "og:description", content: guide.description },
    { property: "og:url", content: `https://salonzee.com/blog/${guide.slug}` },
    { property: "og:type", content: "article" }, { property: "article:published_time", content: guide.date },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: `https://salonzee.com/blog/${guide.slug}` }], scripts: [{ type: "application/ld+json", children: JSON.stringify({
    "@context": "https://schema.org", "@type": "Article", headline: guide.title, description: guide.description,
    datePublished: guide.date, dateModified: guide.date, author: { "@type": "Organization", name: "Salonzee", url: "https://salonzee.com" },
    publisher: { "@type": "Organization", name: "Salonzee", url: "https://salonzee.com" },
    mainEntityOfPage: `https://salonzee.com/blog/${guide.slug}`,
  }) }] }) : ({ meta: [{ title: "Guide unavailable — Salonzee" }, { name: "robots", content: "noindex" }, { name: "description", content: "This Salonzee guide is unavailable." }, { property: "og:title", content: "Guide unavailable — Salonzee" }, { property: "og:description", content: "This Salonzee guide is unavailable." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  notFoundComponent: () => <div className="mx-auto max-w-xl px-5 py-16"><h1 className="text-3xl">Guide not found</h1><Button asChild variant="link"><Link to="/blog">Browse the journal</Link></Button></div>,
  component: GuidePage,
});
function GuidePage() {
  const guide = Route.useLoaderData();
  const owner = guide.audience === "Business owners";
  return <div className="min-h-dvh bg-background"><SiteNav /><article className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
    <Button asChild variant="link" className="mb-6 px-0"><Link to="/blog"><ArrowLeft />All guides</Link></Button>
    <header><p className="text-sm font-medium text-primary">{guide.audience} · Salonzee journal</p><h1 className="mt-3 text-3xl leading-tight sm:text-4xl">{guide.title}</h1><p className="mt-4 text-lg leading-relaxed text-muted-foreground">{guide.description}</p><p className="mt-4 text-xs text-muted-foreground">By Salonzee · <time dateTime={guide.date}>6 November 2026</time></p><img src={guide.image} alt={guide.imageAlt} className="mt-6 aspect-[16/8] w-full rounded-lg object-cover" /></header>
    <div className="mx-auto mt-10 max-w-2xl space-y-10"><div>{guide.introduction.map((paragraph, index) => <p key={index} className="mt-4 text-base leading-8 text-foreground/85">{paragraph}</p>)}</div>{guide.sections.map(section => <section key={section.title}><h2 className="mb-4 text-2xl">{section.title}</h2>{section.paragraphs.map((paragraph, index) => <p key={index} className="mt-4 text-base leading-8 text-foreground/85">{paragraph}</p>)}{section.checklist && <ul className="mt-5 space-y-2 border-l-2 border-primary pl-6 text-sm leading-7">{section.checklist.map(item => <li key={item}>• {item}</li>)}</ul>}</section>)}
      <section className="border-y border-border py-8"><h2 className="text-2xl">{owner ? "Put your booking page to work" : "Find your next appointment"}</h2><div className="mt-5 flex flex-wrap gap-3"><Button asChild><Link to={owner ? "/register-salon" : "/salons"}>{owner ? "List your business" : "Browse beauty shops"}<ArrowRight /></Link></Button><Button asChild variant="outline"><Link to="/features">Explore Salonzee</Link></Button></div></section>
      <aside><h2 className="text-lg">More from the journal</h2><ul className="mt-4 space-y-4">{guides.filter(other => other.slug !== guide.slug).map(other => <li key={other.slug}><Link className="text-primary hover:underline" to="/blog/$slug" params={{ slug: other.slug }}>{other.title}</Link></li>)}</ul></aside>
    </div>
  </article><SiteFooter /></div>;
}