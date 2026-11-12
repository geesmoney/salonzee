import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { newAlerts, playAlert } from "@/lib/notification-alerts";

export function OwnerNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const seen = useRef<Set<string> | null>(null);
  const [sound, setSound] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    seen.current = null;
    setSound(localStorage.getItem(`salonzee-alert-sound:${user?.id}`) === "on");
    setReady(false);
  }, [user?.id]);
  const { data: rows = [], isError } = useQuery({
    queryKey: ["owner-notifications", user?.id],
    enabled: !!user,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("owner_notifications")
        .select("id,title,body,url,kind,created_at,read_at")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    if (!rows.length) return;
    const fresh = newAlerts(seen.current, rows);
    seen.current = new Set([...(seen.current ?? []), ...rows.map((row) => row.id)]);
    if (fresh.length) {
      const latest = rows[0];
      toast(latest.title, { description: latest.body, action: { label: "Open", onClick: () => window.location.assign(latest.url) } });
      if (sound && ready) void playAlert().catch(() => setReady(false));
      if (fresh.some((row) => rows.find((r) => r.id === row.id)?.kind === "owner_booking_received")) {
        void qc.invalidateQueries({ queryKey: ["salon-dashboard", user?.id] });
      }
    }
  }, [rows, sound, ready, qc, user?.id]);
  // Establish an empty baseline too: the very first future alert must chime.
  useEffect(() => {
    if (qc.getQueryState(["owner-notifications", user?.id])?.status === "success" && !rows.length) seen.current ??= new Set();
  }, [rows, qc, user?.id]);
  if (!user) return null;
  const unread = rows.filter((row) => !row.read_at).length;
  async function markRead(id?: string) {
    let q = supabase.from("owner_notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user?.id ?? "");
    if (id) q = q.eq("id", id);
    else q = q.is("read_at", null);
    const { error } = await q;
    if (error) return toast.error("Couldn't mark notifications as read.");
    await qc.invalidateQueries({ queryKey: ["owner-notifications", user?.id] });
  }
  return <Popover>
    <PopoverTrigger asChild><Button variant="ghost" size="icon" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} className="relative shrink-0">
      <Bell className="h-5 w-5" />
      {unread > 0 && <span className="absolute -top-1 -right-1 rounded-full bg-primary text-primary-foreground text-xs min-w-5 h-5 grid place-items-center">{unread > 49 ? "49+" : unread}</span>}
    </Button></PopoverTrigger>
    <PopoverContent align="end" className="w-[min(360px,calc(100vw-24px))] p-0">
      <div className="p-4 flex items-center justify-between border-b border-border"><h2 className="font-semibold">Notifications</h2>
        <Button variant="ghost" size="icon" title="Mark all as read" aria-label="Mark all as read" disabled={!unread} onClick={() => void markRead()}><CheckCheck /></Button>
      </div>
      <div className="p-3 border-b border-border"><Button variant="outline" className="w-full" onClick={async () => {
        if (sound && ready) { setSound(false); setReady(false); localStorage.setItem(`salonzee-alert-sound:${user.id}`, "off"); return; }
        try { const playing = await playAlert(); if (!playing) throw new Error("blocked"); setSound(true); setReady(true); localStorage.setItem(`salonzee-alert-sound:${user.id}`, "on"); }
        catch { toast.error("Sound is blocked by this browser."); }
      }}>{sound && ready ? <Volume2 /> : <VolumeX />}{sound && ready ? "Mute sounds" : sound ? "Resume alert sounds" : "Enable alert sounds"}</Button></div>
      <div className="max-h-80 overflow-y-auto">
        {isError ? <p className="p-5 text-sm text-muted-foreground">Notifications couldn't load.</p> : rows.length ? rows.map((row) => <a key={row.id} href={row.url} onClick={() => void markRead(row.id)} className={`block p-4 border-b border-border hover:bg-muted ${!row.read_at ? "bg-secondary" : ""}`}>
          <p className="font-semibold text-sm flex gap-2 items-center">{!row.read_at && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}{row.title}</p>
          <p className="text-sm text-muted-foreground mt-1">{row.body}</p>
          <time className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</time>
        </a>) : <p className="p-5 text-sm text-muted-foreground">No notifications yet.</p>}
      </div>
    </PopoverContent>
  </Popover>;
}