/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_EMBEDDING_MODEL?: string;
  readonly VITE_PBKDF2_ITERATIONS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
