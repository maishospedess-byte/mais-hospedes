import { createBrowserClient } from '@supabase/ssr'

// TODO: Add Database generic once types are generated via `supabase gen types typescript`
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export const createBrowserSupabase = createClient
