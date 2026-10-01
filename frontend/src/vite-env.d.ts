/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Address of the calculate service. Empty means the page's own origin. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
