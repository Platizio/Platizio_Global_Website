// Magic-link tokens for the customer status page.
//
// The token is a bearer credential: whoever holds the URL sees the tickets it
// points at. Two properties follow from that, and both are enforced here rather
// than left to the caller.
//
// It has to be unguessable — 32 bytes from the platform CSPRNG, not a UUID and
// not anything derived from the email, because a token derived from a known
// input is a token an attacker can compute.
//
// And it must not be readable out of the database. Only the SHA-256 is stored,
// so the table holds no working links; a plain hash with no salt or stretching
// is right here, because the input is already 256 bits of entropy and there is
// no dictionary to attack.

/** URL-safe, no padding — this ends up in a query string. */
function base64url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function newAccessToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return base64url(bytes)
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Where the link points. Overridable so a preview deployment can test itself. */
export function siteUrl(): string {
  return (Deno.env.get('SITE_URL') ?? 'https://platizioglobal.com').replace(/\/+$/, '')
}

export const TOKEN_TTL_MINUTES = 30
