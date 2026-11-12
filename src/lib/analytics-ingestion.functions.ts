import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { analyticsEventSchema, isSameOriginSubmission } from "./analytics-ingestion";
import { readVisitorLocation } from "./visitor-location";

export const recordAnalyticsEvent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => analyticsEventSchema.parse(input))
  .handler(async ({ data }) => {
    const request = getRequest();
    if (!isSameOriginSubmission(request)) throw new Error("Submission rejected.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.kind === "visit") {
      const { kind: _kind, ...row } = data;
      const { error } = await supabaseAdmin.from("site_visits").insert({
        ...row,
        ...readVisitorLocation(request.headers, (request as Request & { cf?: unknown }).cf),
      });
      if (error) throw new Error("Tracking unavailable.");
    } else {
      const { kind: _kind, ...row } = data;
      const { error } = await supabaseAdmin.from("app_install_events").insert(row);
      if (error) throw new Error("Tracking unavailable.");
    }
    return { ok: true };
  });