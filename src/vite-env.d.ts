/// <reference types="vite/client" />

// The site's first environment variables. Declared rather than left to the
// permissive default `Record<string, string>` that vite/client provides,
// because a typo in `import.meta.env.VITE_SUPBASE_URL` would otherwise be
// `string | undefined` and compile happily, then fail silently in production by
// falling back to the legacy transport.
//
// All three are optional on purpose, and each absence has a defined meaning:
//
//   VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
//     Both unset — support requests go to Web3Forms and no ticket reference is
//     issued. See src/help/api/support.ts.
//
//   VITE_TURNSTILE_SITE_KEY
//     Unset — the captcha widget is not rendered. The server has the matching
//     switch: with no TURNSTILE_SECRET_KEY it accepts the submission and
//     records captcha_verified = false. Both must be set before intake is
//     linked publicly.
//
// None of these are secrets. Everything prefixed VITE_ is inlined into the
// bundle at build time and is readable by anyone who opens the page. The
// service role key is not here and must never be — it lives in Supabase
// secrets only.

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_TURNSTILE_SITE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
