import { createFileRoute } from '@tanstack/react-router';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

// Bookings are stored as local Ghana time (UTC+0), so we can emit UTC directly.
function toUtcStamp(date: string, time: string) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return `${y}${pad(m!)}${pad(d!)}T${pad(hh!)}${pad(mm!)}00Z`;
}

function esc(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function fold(line: string) {
  if (line.length <= 73) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    parts.push(rest.slice(0, 73));
    rest = ' ' + rest.slice(73);
  }
  parts.push(rest);
  return parts.join('\r\n');
}

export const Route = createFileRoute('/api/public/calendar/$token.ics')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = (params as { token: string }).token.replace(/\.ics$/, '');
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
          return new Response('Not found', { status: 404 });
        }

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

        const { data: tokenRow } = await supabaseAdmin
          .from('salon_calendar_tokens')
          .select('salon_id')
          .eq('token', token)
          .maybeSingle();

        if (!tokenRow) return new Response('Not found', { status: 404 });

        const { data: salon } = await supabaseAdmin
          .from('salons')
          .select('id, name')
          .eq('id', tokenRow.salon_id)
          .maybeSingle();

        if (!salon) return new Response('Not found', { status: 404 });

        const { data: bookings } = await supabaseAdmin
          .from('bookings')
          .select('id, customer_name, customer_phone, booking_date, start_time, end_time, status, notes, updated_at, services(name)')
          .eq('salon_id', salon.id)
          .neq('status', 'cancelled')
          .gte('booking_date', new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString().slice(0, 10))
          .order('booking_date', { ascending: true });

        const lines: string[] = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//Salonzee//Bookings//EN',
          'CALSCALE:GREGORIAN',
          'METHOD:PUBLISH',
          `X-WR-CALNAME:${esc(salon.name)} — Salonzee bookings`,
          'X-PUBLISHED-TTL:PT15M',
          'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
        ];

        for (const b of bookings ?? []) {
          const service = (b as { services?: { name?: string } | null }).services?.name ?? 'Appointment';
          const summary = `${b.customer_name} — ${service}`;
          const desc = [
            `Service: ${service}`,
            `Customer: ${b.customer_name}`,
            `Phone: ${b.customer_phone}`,
            `Status: ${b.status}`,
            b.notes ? `Notes: ${b.notes}` : null,
          ]
            .filter(Boolean)
            .join('\n');

          lines.push(
            'BEGIN:VEVENT',
            `UID:${b.id}@salonzee.com`,
            `DTSTAMP:${toUtcStamp(b.booking_date, '00:00')}`,
            `DTSTART:${toUtcStamp(b.booking_date, b.start_time)}`,
            `DTEND:${toUtcStamp(b.booking_date, b.end_time)}`,
            fold(`SUMMARY:${esc(summary)}`),
            fold(`DESCRIPTION:${esc(desc)}`),
            `STATUS:${b.status === 'pending' ? 'TENTATIVE' : 'CONFIRMED'}`,
            'END:VEVENT',
          );
        }

        lines.push('END:VCALENDAR');

        return new Response(lines.join('\r\n') + '\r\n', {
          status: 200,
          headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Cache-Control': 'public, max-age=300',
            'Content-Disposition': 'inline; filename="salonzee.ics"',
          },
        });
      },
    },
  },
});
