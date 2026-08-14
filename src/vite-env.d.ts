/// <reference types="vite/client" />

/** Build-time constant injected by vite.config.ts `define`. */
declare const __BUILD_YEAR__: number

/**
 * Environment variables. Both are optional: with neither set, the support
 * assistant falls back to drafting an email instead of posting a ticket, so the
 * site still builds and deploys without any Supabase configuration.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
