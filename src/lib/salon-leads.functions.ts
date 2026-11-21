import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { isSameOriginSubmission } from "@/lib/analytics-ingestion";
import {
  normalizeSalonLeadPhone,
  salonLeadAlertMessage,
  salonLeadSchema,
} from "@/lib/salon-leads";

const MIN_FORM_TIME_MS = 1500;
const MAX_LEADS_PER_PHONE_24H = 3;
const ADMIN_ALERT_PHONE = "0248341613";

export const submitSalonLead = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => salonLeadSchema.parse(input))
  .handler(async ({ data }) => {
    const request = getRequest();
    if (!isSameOriginSubmission(request)) throw new Error("Submission rejected. Please reload the page and try again.");

    // Return quietly to automated form fillers without creating a lead or an SMS.
    if (data.honeypot) return { ok: true as const, duplicate: false, adminAlertQueued: false };
    if (data.elapsedMs < MIN_FORM_TIME_MS) {
      throw new Error("Please take a moment to review your details, then submit again.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = normalizeSalonLeadPhone(data.phone);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent, error: recentError } = await supabaseAdmin
      .from("salon_leads")
      .select("id, business_name")
      .eq("phone", phone)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(MAX_LEADS_PER_PHONE_24H);

    if (recentError) {
      console.error("[submitSalonLead] recent-lead lookup failed", recentError);
      throw new Error("We could not save your request just now. Please try again.");
    }

    const businessName = data.businessName.trim().toLocaleLowerCase();
    const duplicate = (recent ?? []).find(
      (lead) => lead.business_name.trim().toLocaleLowerCase() === businessName,
    );
    if (duplicate) return { ok: true as const, duplicate: true, adminAlertQueued: true };
    if ((recent?.length ?? 0) >= MAX_LEADS_PER_PHONE_24H) {
      throw new Error("We have already received several requests for this number today. Please try again tomorrow.");
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("salon_leads")
      .insert({
        owner_name: data.ownerName,
        business_name: data.businessName,
        phone,
        business_category: data.businessCategory,
        city: data.city,
        area: data.area || null,
        preferred_contact: data.preferredContact,
        help_text: data.helpText || null,
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
        utm_term: data.utm_term,
        utm_content: data.utm_content,
        gclid: data.gclid,
        referrer: data.referrer,
        landing_path: data.landing_path,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("[submitSalonLead] insert failed", insertError);
      throw new Error("We could not save your request just now. Please try again.");
    }

    const message = salonLeadAlertMessage({
      ownerName: data.ownerName,
      businessName: data.businessName,
      phone,
      businessCategory: data.businessCategory,
      city: data.city,
      area: data.area || null,
      preferredContact: data.preferredContact,
    });
    const { data: alert, error: alertError } = await supabaseAdmin
      .from("sms_log")
      .insert({
        to_phone: ADMIN_ALERT_PHONE,
        template: "admin_new_salon_lead",
        payload: {
          message,
          lead_id: inserted.id,
          business_name: data.businessName,
        },
        status: "stubbed",
      })
      .select("id")
      .single();

    if (alertError || !alert) {
      // The lead is safe even if the alert cannot be queued; the admin page flags it.
      console.error("[submitSalonLead] admin alert insert failed", alertError);
      return { ok: true as const, duplicate: false, adminAlertQueued: false };
    }

    const { error: linkError } = await supabaseAdmin
      .from("salon_leads")
      .update({ admin_alert_sms_id: alert.id })
      .eq("id", inserted.id);
    if (linkError) console.error("[submitSalonLead] alert link failed", linkError);

    return { ok: true as const, duplicate: false, adminAlertQueued: !linkError };
  });
