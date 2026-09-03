/// <reference types="vite/client" />

/**
 * Both are optional in the type, and required in practice.
 *
 * Declaring them as `string` would be a lie that `strict` cannot catch: Vite
 * substitutes `undefined` for an unset variable at build time, so the check in
 * lib/supabase.ts exists precisely because the type has to admit the missing
 * case.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
