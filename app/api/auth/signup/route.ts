import { NextResponse } from 'next/server';
import { linkStripeCustomerToUser } from '@/lib/billing/link-stripe';
import { isBillingEnabled } from '@/lib/stripe/config';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function findUserByEmail(admin: ReturnType<typeof createAdminSupabaseClient>, email: string) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.find(u => u.email?.toLowerCase() === email) ?? null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = body.email ? normalizeEmail(body.email) : '';
    const password = body.password ?? '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (!error) {
      if (isBillingEnabled()) {
        try {
          await linkStripeCustomerToUser(data.user.id, email);
        } catch (linkError) {
          console.error('[auth/signup] link stripe', linkError);
        }
      }
      return NextResponse.json({ ok: true, userId: data.user.id });
    }

    const msg = error.message.toLowerCase();
    const alreadyExists =
      msg.includes('already') || msg.includes('registered') || msg.includes('exists');

    if (alreadyExists) {
      const existing = await findUserByEmail(admin, email);
      if (!existing) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
      });

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }

      if (isBillingEnabled()) {
        try {
          await linkStripeCustomerToUser(existing.id, email);
        } catch (linkError) {
          console.error('[auth/signup] link stripe', linkError);
        }
      }

      return NextResponse.json({ ok: true, userId: existing.id, updated: true });
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  } catch (error) {
    console.error('[auth/signup]', error);
    return NextResponse.json({ error: 'Could not create account.' }, { status: 500 });
  }
}
