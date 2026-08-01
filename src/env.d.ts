/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_GOOGLE_MAPS_EMBED_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
