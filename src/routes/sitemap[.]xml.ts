import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BASE_URL = "https://salonzee.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/salons", changefreq: "daily", priority: "0.9" },
          { path: "/register-salon", changefreq: "monthly", priority: "0.6" },
          { path: "/report-issue", changefreq: "yearly", priority: "0.3" },
          { path: "/login", changefreq: "yearly", priority: "0.2" },
        ];

        try {
          const { data } = await supabaseAdmin
            .from("salons")
            .select("slug, updated_at")
            .eq("status", "active");
          for (const s of data ?? []) {
            if (!s.slug) continue;
            entries.push({
              path: `/${s.slug}`,
              lastmod: s.updated_at ?? undefined,
              changefreq: "weekly",
              priority: "0.8",
            });
          }
        } catch {
          // If the DB call fails, still return the static entries.
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
