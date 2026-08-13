// Cloudflare Turnstile verification.
//
// Behaviour turns on whether TURNSTILE_SECRET_KEY is set:
//
//   set    — a token is required and verified against Cloudflare. A missing,
//            malformed or rejected token fails the request. This is the state
//            intake must be in before the form is linked publicly.
//   unset  — the request proceeds and the ticket is written with
//            captcha_verified = false.
//
// The second mode exists because the captcha account is a human dependency with
// its own lead time, and blocking every submission until it lands would mean
// the intake path could not be exercised at all before then. It is not a
// permanent state, and it is deliberately visible in two places rather than
// one: a warning in the function log, and a column on every affected row that
// can be counted later. Going live without the secret is a decision somebody
// has to notice they are making.

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export interface CaptchaOutcome {
  ok: boolean
  verified: boolean
  message?: string
}

export async function verifyTurnstile(token: string | null, ip: string | null): Promise<CaptchaOutcome> {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')

  if (!secret) {
    console.warn(
      'TURNSTILE_SECRET_KEY is not set — accepting intake without a captcha check. ' +
      'This ticket will be recorded with captcha_verified = false.',
    )
    return { ok: true, verified: false }
  }

  if (!token) {
    return { ok: false, verified: false, message: 'Please complete the verification challenge and try again.' }
  }

  const form = new FormData()
  form.append('secret', secret)
  form.append('response', token)
  if (ip) form.append('remoteip', ip)

  try {
    const res = await fetch(VERIFY_URL, { method: 'POST', body: form })
    const data = await res.json() as { success?: boolean; 'error-codes'?: string[] }

    if (data.success) return { ok: true, verified: true }

    console.warn('Turnstile rejected a token', data['error-codes'])
    return {
      ok: false,
      verified: false,
      message: 'That verification could not be confirmed. Please try again.',
    }
  } catch (error) {
    // Cloudflare being unreachable must not silently downgrade to no captcha:
    // an attacker who can cause that failure would have found the way round.
    console.error('Turnstile verification could not be reached', error)
    return {
      ok: false,
      verified: false,
      message: 'We could not complete the verification check. Please try again in a moment.',
    }
  }
}
