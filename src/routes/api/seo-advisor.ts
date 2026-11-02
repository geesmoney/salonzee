import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/seo-advisor")({
  server: { handlers: { POST: async ({ request }) => {
    const { handleSeoAdvisor } = await import("@/lib/seo-advisor.server");
    return handleSeoAdvisor(request);
  } } },
});