import { createFileRoute } from '@tanstack/react-router';
import { readVisitorLocation } from '@/lib/visitor-location';

// Returns only the caller's own coarse location (country + region) taken from
// Cloudflare's request metadata. Nothing about any other visitor is exposed,
// nothing is stored here, and no IP address or coordinate is ever returned.
export const Route = createFileRoute('/api/public/visit-location')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cf = (request as Request & { cf?: unknown }).cf;
        return Response.json(readVisitorLocation(request.headers, cf), {
          headers: { 'Cache-Control': 'no-store' },
        });
      },
    },
  },
});
