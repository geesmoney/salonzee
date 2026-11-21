import { supabase } from "@/integrations/supabase/client";

const KEY = "salonzee:pending-booking-claim";

/** Remember a just-made guest booking so it can be linked after sign-up/sign-in. */
export function rememberBookingToClaim(bookingId: string) {
  try { window.sessionStorage.setItem(KEY, bookingId); } catch { /* ignore */ }
}

/** Link a remembered guest booking (made within 24h) to the signed-in account. Never throws. */
export async function claimPendingBooking(): Promise<boolean> {
  let id: string | null = null;
  try { id = window.sessionStorage.getItem(KEY); } catch { return false; }
  if (!id) return false;
  const { data, error } = await supabase.rpc("claim_my_booking", { _booking_id: id });
  if (!error) { try { window.sessionStorage.removeItem(KEY); } catch { /* ignore */ } }
  return !error && data === true;
}

export async function claimBooking(bookingId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("claim_my_booking", { _booking_id: bookingId });
  return !error && data === true;
}

/** Where a signed-in person should land: admins → admin, salon owners → dashboard, customers → bookings. */
export async function homeFor(userId: string, isPlatformAdmin: boolean): Promise<string> {
  if (isPlatformAdmin) return "/admin/pending";
  const { data } = await supabase.from("salons").select("id").eq("user_id", userId).limit(1);
  return data && data.length > 0 ? "/salon/dashboard" : "/account";
}
