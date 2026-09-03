import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * The one Supabase client.
 *
 * Unlike the marketing site — where `src/lib/backend.ts` treats missing
 * environment as a degraded-but-working state and falls back to a mailto: — an
 * unconfigured console is not degraded, it is inert. There is nothing useful it
 * can do without a project to sign into. So the failure is surfaced as a real
 * screen at startup rather than swallowed into a login form that can never
 * succeed.
 *
 * `configError` is exported instead of throwing at module scope: throwing here
 * would take the whole bundle down before React can render anything, and the
 * result would be a blank page with a console message nobody sees.
 */

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configError: string | null =
  !url || !key
    ? 'This console has not been pointed at a Supabase project. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then redeploy.'
    : null

/**
 * `persistSession` keeps a reload from signing the agent out mid-ticket;
 * `autoRefreshToken` renews the hour-long JWT in the background, which matters
 * because a support desk sits open all day. `detectSessionInUrl` handles the
 * invite and recovery links that land here with a token in the fragment.
 */
export const supabase: SupabaseClient = createClient(url ?? 'http://unconfigured.invalid', key ?? 'unconfigured', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'platizio-console-auth',
    flowType: 'pkce',
  },
})

/**
 * Edge functions are reached with `supabase.functions.invoke`, which attaches
 * the caller's access token rather than the anon key. That is load-bearing for
 * `staff-attachment` and `invite-staff`: both act as `userClient(req)` so that
 * `auth.uid()` inside the RPC is the actual person, and the access log records
 * who opened the file instead of "service role".
 */
export const isConfigured = configError === null
