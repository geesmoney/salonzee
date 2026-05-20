import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Database } from "@/integrations/supabase/types";

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    // Soft chime: two ascending tones
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(659.25, now + 1.5); // E5
    gain1.gain.setValueAtTime(1, now);
    gain1.gain.exponentialRampToValueAtTime(1, now + 1.5); 
    gain1.gain.exponentialRampToValueAtTime(1, now + 2.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 2.5);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, now + 1.5); // E5
    osc2.frequency.exponentialRampToValueAtTime(783.99, now + 1.5); // G5
    gain2.gain.setValueAtTime(1, now + 1.5);
    gain2.gain.exponentialRampToValueAtTime(1, now + 2.5);
    gain2.gain.exponentialRampToValueAtTime(1, now + 3.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 1.5);
    osc2.stop(now + 3.5);

    // Clean up
    setTimeout(() => ctx.close(), 3500);
  } catch {
    // Audio not available, silently ignore
  }
}

function playReplySound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    // Gentle descending two-tone ping
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.exponentialRampToValueAtTime(440, now + 1.5); // A4
    gain.gain.setValueAtTime(1, now);
    gain.gain.exponentialRampToValueAtTime(1, now + 1.5);
    gain.gain.exponentialRampToValueAtTime(1, now + 2.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 2.5);

    setTimeout(() => ctx.close(), 3000);
  } catch {
    // Audio not available, silently ignore
  }
}

type Ticket = Database["public"]["Tables"]["support_tickets"]["Row"];
type Message = Database["public"]["Tables"]["support_messages"]["Row"];

/**
 * Global realtime listener that shows popup toasts on every page:
 *  - Platform admins: toast when a new support ticket is opened.
 *  - Salon owners / ticket openers: toast when a new admin reply arrives.
 * Mounted once at the root inside <AuthProvider>.
 */
export function SupportNotifier() {
  const { user, isPlatformAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const mountedAt = useRef<number>(Date.now());

  useEffect(() => {
    if (!user) return;
    mountedAt.current = Date.now();

    const channel = supabase.channel(`support-notify-${user.id}`);

    if (isPlatformAdmin) {
      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_tickets" },
        (payload) => {
          const t = payload.new as Ticket;
          if (new Date(t.created_at).getTime() < mountedAt.current - 5000) return;
          playNotificationSound();
          toast.success("New support ticket", {
            description: t.subject,
            action: {
              label: "Open",
              onClick: () => navigate({ to: "/admin/support" }),
            },
          });
          qc.invalidateQueries({ queryKey: ["support-tickets", "admin"] });
        },
      );

      // Admins: notify on new messages from owners/customers on existing tickets.
      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages" },
        (payload) => {
          const msg = payload.new as Message;
          if (msg.sender_type === "admin") return; // skip admin's own/peer replies
          if (msg.sender_user_id === user.id) return;
          playReplySound();
          toast.message("New support message", {
            description: msg.body.slice(0, 100),
            action: {
              label: "Open",
              onClick: () => navigate({ to: "/admin/support" }),
            },
          });
          qc.invalidateQueries({ queryKey: ["support-tickets", "admin"] });
          qc.invalidateQueries({ queryKey: ["support-messages", msg.ticket_id] });
        },
      );
    }

    // Owner / ticket-opener: notify on new admin replies.
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
        filter: "sender_type=eq.admin",
      },
      (payload) => {
        const msg = payload.new as Message;
        if (msg.sender_user_id === user.id) return; // sent by self (admin)
        if (isPlatformAdmin) return; // admins don't need owner-side toast

        playReplySound();
        toast.message("New reply from Salonzee support", {
          description: msg.body.slice(0, 100),
          action: {
            label: "View",
            onClick: () => navigate({ to: "/salon/support" }),
          },
        });
        qc.invalidateQueries({ queryKey: ["support-tickets", "owner"] });
        qc.invalidateQueries({ queryKey: ["support-messages", msg.ticket_id] });
      },
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isPlatformAdmin, navigate, qc]);

  return null;
}
