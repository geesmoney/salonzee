import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const tokenSchema = z.string().uuid("Invalid review link");

const submitSchema = z.object({
  token: tokenSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().nullable(),
});

export const getReviewContext = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: tokenSchema }).parse(input))
  .handler(async ({ data }) => {
    const { data: ctx, error } = await supabaseAdmin.rpc("get_review_context", {
      _token: data.token,
    });
    if (error) {
      throw new Error(error.message || "Invalid review link");
    }
    return ctx as {
      booking_id: string;
      customer_name: string;
      booking_date: string;
      salon_id: string;
      salon_name: string;
      salon_slug: string | null;
      status: string;
      already_reviewed: boolean;
    };
  });

export const submitReview = createServerFn({ method: "POST" })
  .inputValidator((input) => submitSchema.parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.rpc("submit_review", {
      _token: data.token,
      _rating: data.rating,
      _comment: data.comment ?? null,
    });
    if (error) {
      throw new Error(error.message || "Could not submit review");
    }
    return { ok: true };
  });
