import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { DEMO_COURSE_COOKIE, DEMO_PAID_COOKIE } from '@/lib/billing/demo';
import {
  CHECKOUT_SESSION_COOKIE,
  isCheckoutSessionId,
} from '@/lib/billing/checkout-receipt';
import { grantCourseAccess } from '@/lib/billing/course';
import { reconcileBillingForUser } from '@/lib/billing/link-stripe';
import { upsertBillingForUser } from '@/lib/billing/profile';
import { isBillingDemoFlow, isBillingEnabled } from '@/lib/stripe/config';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function findUserByEmail(admin: ReturnType<typeof createAdminSupabaseClient>, email: string) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.find(u => u.email?.toLowerCase() === email) ?? null;
}

async function attachDemoEntitlements(userId: string) {
  const cookieStore = cookies();
  const paid = cookieStore.get(DEMO_PAID_COOKIE)?.value === '1';
  const course = cookieStore.get(DEMO_COURSE_COOKIE)?.value === '1';

  if (paid) {
    await upsertBillingForUser(createAdminSupabaseClient(), userId, {
      stripe_customer_id: `cus_demo_${userId.slice(0, 8)}`,
      subscription_status: 'active',
      subscription_ends_at: null,
    });
  }

  if (course) {
    await grantCourseAccess(userId);
  }
}

function resolveSessionId(bodySessionId: string | undefined): string | null {
  if (isCheckoutSessionId(bodySessionId)) return bodySessionId;
  const fromCookie = cookies().get(CHECKOUT_SESSION_COOKIE)?.value?.trim() || '';
  return isCheckoutSessionId(fromCookie) ? fromCookie : null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string;
      password?: string;
      session_id?: string;
    };
    const email = body.email ? normalizeEmail(body.email) : '';
    const password = body.password ?? '';
    const sessionId = resolveSessionId(body.session_id?.trim());

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
      let link: { linked: boolean; reason: string } | null = null;
      if (isBillingDemoFlow()) {
        try {
          await attachDemoEntitlements(data.user.id);
          link = { linked: true, reason: 'linked' };
        } catch (demoError) {
          console.error('[auth/signup] demo billing', demoError);
        }
      } else if (isBillingEnabled()) {
        try {
          link = await reconcileBillingForUser(data.user.id, email, sessionId);
          if (cookies().get(DEMO_COURSE_COOKIE)?.value === '1') {
            await grantCourseAccess(data.user.id);
          }
        } catch (linkError) {
          console.error('[auth/signup] link stripe', linkError);
        }
      }
      return NextResponse.json({ ok: true, userId: data.user.id, link });
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

      let link: { linked: boolean; reason: string } | null = null;
      if (isBillingDemoFlow()) {
        try {
          await attachDemoEntitlements(existing.id);
          link = { linked: true, reason: 'linked' };
        } catch (demoError) {
          console.error('[auth/signup] demo billing', demoError);
        }
      } else if (isBillingEnabled()) {
        try {
          link = await reconcileBillingForUser(existing.id, email, sessionId);
          if (cookies().get(DEMO_COURSE_COOKIE)?.value === '1') {
            await grantCourseAccess(existing.id);
          }
        } catch (linkError) {
          console.error('[auth/signup] link stripe', linkError);
        }
      }

      return NextResponse.json({ ok: true, userId: existing.id, updated: true, link });
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  } catch (error) {
    console.error('[auth/signup]', error);
    return NextResponse.json({ error: 'Could not create account.' }, { status: 500 });
  }
}
