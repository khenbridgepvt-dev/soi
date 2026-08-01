import { createClient } from '@/lib/supabase/server';
import packageJson from '../../../../package.json';

type HealthStatus = 'healthy' | 'degraded';

async function checkDatabaseReachable(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || key === 'your-anon-key-here') {
    return false;
  }

  try {
    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    return response.status < 500;
  } catch {
    return false;
  }
}

export async function GET() {
  const timestamp = new Date().toISOString();
  const environment = process.env.NODE_ENV ?? 'development';
  const version = packageJson.version;

  let authReachable = false;

  try {
    const supabase = await createClient();
    const { error: authError } = await supabase.auth.getSession();
    authReachable = !authError;
  } catch {
    // Supabase not running or env vars missing — report degraded, not crash.
  }

  const database = await checkDatabaseReachable();

  const status: HealthStatus =
    database && authReachable ? 'healthy' : 'degraded';

  return Response.json({
    status,
    timestamp,
    version,
    database: database ? 'connected' : 'disconnected',
    environment,
  });
}
