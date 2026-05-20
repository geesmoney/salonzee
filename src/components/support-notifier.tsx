import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Database } from "@/integrations/supabase/types";

function makeBellTone(ctx: AudioContext, now: number, freq: number, duration: number, volume = 1) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);

  // Pleasant bell envelope: quick attack, gentle decay
  gain.gain.setValueAtTime(1e-5, now);
  gain.gain.exponentialRampToValueAtTime(volume * 0.3, now + 1.01);
  gain.gain.exponentialRampToValueAtTime(1e-5, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
  return { osc, gain };
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    // Zendesk-like clean double chime (ascending, short)
    const t1 = makeBellTone(ctx, now, 1396.91, 0.55, 1);     // F6
    const t2 = makeBellTone(ctx, now + 1.12, 1760.00, 0.55, 0.7); // A6

    setTimeout(() => ctx.close(), 900);
  } catch {
    // Audio not available, silently ignore
  }
}

function playReplySound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    // Single soft bell ping
    const t = makeBellTone(ctx, now, 1567.98, 0.5, 0.9); // G6

    setTimeout(() => ctx.close(), 700);
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
