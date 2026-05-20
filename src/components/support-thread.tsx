import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Ticket = Database["public"]["Tables"]["support_tickets"]["Row"];
type Message = Database["public"]["Tables"]["support_messages"]["Row"];
type SenderType = Database["public"]["Enums"]["support_sender_type"];
type Status = Database["public"]["Enums"]["support_ticket_status"];

export function SupportThread({
  ticket,
  viewerRole,
  viewerUserId,
}: {
  ticket: Ticket;
  viewerRole: "owner" | "admin";
  viewerUserId: string;
}) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["support-messages", ticket.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    refetchInterval: 15_000,
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const send = useMutation({
    mutationFn: async (text: string) => {
      const senderType: SenderType = viewerRole === "admin" ? "admin" : "owner";
      const { error } = await supabase.from("support_messages").insert({
        ticket_id: ticket.id,
        sender_type: senderType,
        sender_user_id: viewerUserId,
        body: text,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["support-messages", ticket.id] });
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async (status: Status) => {
      const { error } = await supabase.from("support_tickets").update({ status }).eq("id", ticket.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
      toast.success("Ticket updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-foreground/10 pb-4 mb-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="font-serif text-xl flex-1">{ticket.subject}</h2>
          <StatusPill status={ticket.status} />
        </div>
        <p className="text-xs text-foreground/50 capitalize">
          {ticket.category.replace("_", " ")}
          {ticket.customer_name && ` • from ${ticket.customer_name}`}
          {ticket.customer_phone && ` • ${ticket.customer_phone}`}
          {ticket.booking_id && ` • booking #${ticket.booking_id.slice(0, 8)}`}
        </p>
        <div className="flex gap-2 mt-3">
          {ticket.status !== "resolved" && (
            <button
              onClick={() => updateStatus.mutate("resolved")}
              className="text-[10px] font-bold uppercase tracking-[0.2em] border border-foreground/20 px-3 py-1.5 rounded-full hover:bg-secondary"
            >
              Mark resolved
            </button>
          )}
          {ticket.status !== "closed" && (
            <button
              onClick={() => updateStatus.mutate("closed")}
              className="text-[10px] font-bold uppercase tracking-[0.2em] border border-foreground/20 px-3 py-1.5 rounded-full hover:bg-secondary"
            >
              Close
            </button>
          )}
          {(ticket.status === "resolved" || ticket.status === "closed") && (
            <button
              onClick={() => updateStatus.mutate("open")}
              className="text-[10px] font-bold uppercase tracking-[0.2em] border border-foreground/20 px-3 py-1.5 rounded-full hover:bg-secondary"
            >
              Reopen
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[300px] max-h-[55vh]">
        {isLoading ? (
          <p className="text-foreground/40 italic text-sm">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-foreground/40 italic text-sm">No messages yet.</p>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} viewerRole={viewerRole} />)
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const text = body.trim();
          if (!text) return;
          send.mutate(text);
        }}
        className="mt-4 border-t border-foreground/10 pt-4 flex gap-2"
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          maxLength={4000}
          placeholder={viewerRole === "admin" ? "Reply to the user…" : "Type your message to Salonzee support…"}
          className="flex-1 bg-card border border-foreground/15 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={send.isPending || !body.trim()}
          className="bg-foreground text-background px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ message, viewerRole }: { message: Message; viewerRole: "owner" | "admin" }) {
  const isMine =
    (viewerRole === "admin" && message.sender_type === "admin") ||
    (viewerRole === "owner" && message.sender_type === "owner");
  const senderLabel =
    message.sender_type === "admin" ? "Salonzee Support" : message.sender_type === "owner" ? "Salon" : "Customer";

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 px-1">
          {senderLabel} • {new Date(message.created_at).toLocaleString()}
        </p>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
            isMine
              ? "bg-foreground text-background rounded-br-sm"
              : message.sender_type === "admin"
              ? "bg-accent/15 text-foreground rounded-bl-sm"
              : "bg-card border border-foreground/10 rounded-bl-sm"
          }`}
        >
          {message.body}
        </div>
      </div>
    </div>
  );
}

export function StatusPill({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    open: "bg-blue-100 text-blue-900",
    pending: "bg-yellow-100 text-yellow-900",
    resolved: "bg-green-100 text-green-900",
    closed: "bg-foreground/10 text-foreground/60",
  };
  return (
    <span className={`text-[10px] uppercase tracking-[0.2em] font-bold px-2.5 py-1 rounded-full ${styles[status]}`}>
      {status}
    </span>
  );
}
