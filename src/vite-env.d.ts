/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_GROQ_API_KEY: string;
  readonly VITE_TIMEZONE_OFFSET_HOURS?: string; // 시간대 오프셋 (시간 단위, 기본값: 9 = KST)
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

