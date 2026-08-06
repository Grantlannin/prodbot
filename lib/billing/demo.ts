/** Shared demo-checkout helpers for fake purchase → OTO → onboard testing. */

export const DEMO_CHECKOUT_SESSION_ID = 'cs_test_demo';
export const DEMO_PAID_COOKIE = 'dw_demo_paid';
export const DEMO_COURSE_COOKIE = 'dw_demo_course';

export function isDemoCheckoutSessionId(sessionId: string | null | undefined): boolean {
  return typeof sessionId === 'string' && sessionId === DEMO_CHECKOUT_SESSION_ID;
}
