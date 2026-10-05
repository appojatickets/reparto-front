/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string | undefined;
  readonly VITE_SUPABASE_URL: string | undefined;
  readonly VITE_SUPABASE_ANON_KEY: string | undefined;
}
/// <reference types="vite-plugin-pwa/client" />

/** Commit publicado (7 letras); «local» fuera de Vercel. */
declare const __VERSION__: string;
