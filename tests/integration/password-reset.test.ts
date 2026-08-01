import { afterAll, describe, expect, it } from 'vitest';
import {
  cleanupTestUser,
  createServiceClient,
  createTestUser,
} from './helpers';
import { createAnonClient, SEED_CREDENTIALS, signIn } from './rls-harness';

const MAILPIT_API = 'http://127.0.0.1:54324/api/v1';

async function waitForMailpitMessage(
  recipient: string,
  timeoutMs = 10000,
): Promise<{ Subject: string; Text: string; HTML: string }> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const listRes = await fetch(`${MAILPIT_API}/messages`);
    const list = (await listRes.json()) as {
      messages?: Array<{ ID: string; To?: Array<{ Address: string }> }>;
    };

    for (const msg of list.messages ?? []) {
      const to = msg.To?.map((t) => t.Address) ?? [];
      if (!to.some((addr) => addr.toLowerCase() === recipient.toLowerCase())) {
        continue;
      }

      const detailRes = await fetch(`${MAILPIT_API}/message/${msg.ID}`);
      const detail = (await detailRes.json()) as {
        Subject: string;
        Text: string;
        HTML: string;
      };
      return detail;
    }

    await new Promise((r) => setTimeout(r, 400));
  }

  throw new Error(`No Mailpit message for ${recipient} within ${timeoutMs}ms`);
}

describe('password reset email (Supabase Auth + Mailpit)', () => {
  it('delivers a reset link to the local mail catcher', async () => {
    const client = createAnonClient();
    const { email } = SEED_CREDENTIALS.staff;
    const redirectTo =
      'http://127.0.0.1:3000/auth/callback?next=/auth/reset-password';

    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    expect(error).toBeNull();

    const message = await waitForMailpitMessage(email);

    expect(message.Subject.toLowerCase()).toContain('reset');
    const body = `${message.Text}\n${message.HTML}`;
    expect(body).toMatch(/auth\/callback|reset-password|token|code=/i);
  });
});

describe('login — deactivated account (TC-003 backend leg)', () => {
  const service = createServiceClient();
  const email = `deactivated-login-${Date.now()}@example.com`;
  let userId: string;

  afterAll(async () => {
    if (userId) {
      await cleanupTestUser(service, userId);
    }
  });

  it('authenticates to Auth but cannot read an active profile row', async () => {
    const user = await createTestUser(service, email, {
      full_name: 'Deactivated Login Test',
      role: 'staff',
    });
    userId = user.id;

    await service.from('profiles').update({ is_active: false }).eq('id', userId);

    const { client } = await signIn(email, 'TestPass123!');

    const { data: profile, error } = await client
      .from('profiles')
      .select('id')
      .single();

    expect(profile).toBeNull();
    expect(error).not.toBeNull();

    await client.auth.signOut();
  });
});
