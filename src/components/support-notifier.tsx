import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Database } from "@/integrations/supabase/types";

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
