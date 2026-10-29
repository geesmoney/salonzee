import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BASE_URL = "https://salonzee.com";

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

        const databaseUrl = process.env["SUPABASE_URL"];
        const publicKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!databaseUrl || !publicKey) {
          return new Response("Sitemap temporarily unavailable", { status: 503 });
        }
        const client = createClient<Database>(databaseUrl, publicKey, {
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
          global: {
            fetch: (input, init) => {
              const headers = new Headers(init?.headers);
              if (publicKey.startsWith("sb_")) headers.delete("Authorization");
              headers.set("apikey", publicKey);
              return fetch(input, { ...init, headers });
            },
          },
        });
        try {
          for (let offset = 0; ; offset += 1000) {
          const { data, error } = await client
            .from("salons")
            .select("slug, updated_at")
            .eq("status", "active")
            .order("id")
            .range(offset, offset + 999);
          if (error) throw error;
          for (const s of data ?? []) {
            if (!s.slug) continue;
            entries.push({
              path: `/${encodeURIComponent(s.slug)}`,
              lastmod: s.updated_at ?? undefined,
              changefreq: "weekly",
              priority: "0.8",
            });
          }
          if ((data?.length ?? 0) < 1000) break;
          }
        } catch {
          return new Response("Sitemap temporarily unavailable", { status: 503 });
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
