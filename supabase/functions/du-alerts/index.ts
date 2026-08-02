import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { runDuAlerts } from '../../../src/lib/scheduled/du-alerts.ts';
import { todayISODate } from '../../../src/lib/utils/dates.ts';

Deno.serve(async (request) => {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !key) {
    return new Response(JSON.stringify({ error: 'Missing Supabase credentials' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const todayParam = new URL(request.url).searchParams.get('date');
  const today = todayParam ?? todayISODate();
  const result = await runDuAlerts(client, today);

  return new Response(JSON.stringify({ data: { ...result, date: today } }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
