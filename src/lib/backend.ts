/**
 * Where the Supabase backend lives, if it has been pointed at yet.
 *
 * Both variables are optional by design. With neither set the site still
 * builds, still prerenders and still deploys — every caller is expected to
 * degrade to something that reaches a human rather than failing. That is the
 * state in production today, and it is why `isBackendConfigured()` is exported
 * rather than kept private: the difference between "recorded with a reference
 * number" and "we opened your mail client" is something the customer is told,
 * not something hidden from them.
 *
 * Shared by every caller so the two form paths cannot drift into disagreeing
 * about whether the backend is available.
 */
export interface BackendConfig {
  url: string
  key: string
}

export function backendConfig(): BackendConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  return url && key ? { url, key } : null
}

export function isBackendConfigured(): boolean {
  return backendConfig() !== null
}

/** Headers every anonymous call to an edge function needs. */
export function anonHeaders(config: BackendConfig): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.key}`,
  }
}
