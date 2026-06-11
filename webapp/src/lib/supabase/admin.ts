import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Cliente con la service role key: solo para Server Actions que necesitan
// administrar usuarios de auth (crear, invitar, eliminar). Nunca exponer al cliente.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
