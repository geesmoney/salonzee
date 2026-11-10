import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

import { REMINDER_TEMPLATES } from '@/lib/push-config';
import { sendPushForRow } from '@/lib/push.server';

const MNOTIFY_URL = 'https://api.mnotify.com/api/sms/quick';

function normalizeGhanaPhone(raw: string): string {
  let p = raw.replace(/\s|-/g, '').trim();
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('0')) p = '233' + p.slice(1);
  return p;
}

async function sendOne(to: string, message: string, apiKey: string, sender: string) {
  const url = `${MNOTIFY_URL}?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: [normalizeGhanaPhone(to)],
      sender,
      message,
      is_schedule: 'false',
      schedule_date: '',
    }),
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  const ok = res.ok && (json.status === 'success' || json.code === '2000');
  return { ok, status: res.status, body: json };
}

export const Route = createFileRoute('/api/public/hooks/process-sms-queue')({
  server: {
    handlers: {
      POST: async () => {
        const apiKey = process.env.MNOTIFY_API_KEY;
        const sender = process.env.MNOTIFY_SENDER_ID;
        if (!apiKey || !sender) {
          return new Response(
            JSON.stringify({ error: 'MNOTIFY_API_KEY or MNOTIFY_SENDER_ID missing' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          );
        }

        // Booking/transactional texts always go first; reminders only fill leftover capacity.
        const reminderList = `(${REMINDER_TEMPLATES.join(',')})`;
        const { data: urgent, error } = await supabaseAdmin
          .from('sms_log')
          .select('id, to_phone, payload, template')
          .eq('status', 'stubbed')
          .not('template', 'in', reminderList)
          .order('sent_at', { ascending: true })
          .limit(25);
        let rows = urgent ?? [];
        if (!error && rows.length < 25) {
          const { data: extra } = await supabaseAdmin
            .from('sms_log')
            .select('id, to_phone, payload, template')
            .eq('status', 'stubbed')
            .in('template', [...REMINDER_TEMPLATES])
            .order('sent_at', { ascending: true })
            .limit(25 - rows.length);
          rows = rows.concat(extra ?? []);
        }

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
          });
        }

        let sent = 0, failed = 0;
        for (const row of rows ?? []) {
          const message = (row.payload as any)?.message;
          if (!message || !row.to_phone) {
            await supabaseAdmin.from('sms_log').update({
              status: 'failed', error_message: 'Missing message or phone',
            }).eq('id', row.id);
            failed++;
            continue;
          }
          if ((REMINDER_TEMPLATES as readonly string[]).includes(row.template)) {
            await sendPushForRow(supabaseAdmin, row.to_phone, row.payload);
          }
          try {
            const r = await sendOne(row.to_phone, message, apiKey, sender);
            if (r.ok) {
              await supabaseAdmin.from('sms_log').update({
                status: 'sent', sent_at: new Date().toISOString(), error_message: null,
              }).eq('id', row.id);
              sent++;
            } else {
              await supabaseAdmin.from('sms_log').update({
                status: 'failed',
                error_message: `HTTP ${r.status}: ${JSON.stringify(r.body).slice(0, 500)}`,
              }).eq('id', row.id);
              failed++;
            }
          } catch (e: any) {
            await supabaseAdmin.from('sms_log').update({
              status: 'failed', error_message: String(e?.message ?? e).slice(0, 500),
            }).eq('id', row.id);
            failed++;
          }
        }

        return new Response(JSON.stringify({ ok: true, sent, failed, total: rows?.length ?? 0 }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
