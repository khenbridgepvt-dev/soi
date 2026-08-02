import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { runDetectOverdue } from '../../../src/lib/scheduled/detect-overdue.ts';

Deno.serve(async () => {
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

  const result = await runDetectOverdue(client);

  return new Response(JSON.stringify({ data: result }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
