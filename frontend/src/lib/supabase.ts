import { createClient } from '@supabase/supabase-js'

// Strip any character outside printable ASCII (0x21–0x7E) from env values.
// A UTF-8 BOM (U+FEFF) — which CI/CD env-var tooling or BOM-encoded .env files
// can silently prepend — makes the browser throw on every request:
//   "Failed to execute 'set' on 'Headers': String contains non ISO-8859-1 code point"
// because U+FEFF is an invalid HTTP header character. This sanitises url + key
// so the app never sends a malformed `apikey`/`Authorization` header.
const clean = (v: string | undefined): string => (v ?? '').replace(/[^\x21-\x7E]/g, '')

const url = clean(import.meta.env.VITE_SUPABASE_URL as string)
const key = clean(import.meta.env.VITE_SUPABASE_ANON_KEY as string)

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — copy .env.example → .env and fill in your values')
}

export const supabase = createClient(url, key, {
  accessToken: async () => key,
})
