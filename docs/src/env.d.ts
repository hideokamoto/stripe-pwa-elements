/// <reference types="astro/client" />

declare namespace Cloudflare {
  interface Env {
    STRIPE_SECRET_KEY: string;
    ALLOWED_ORIGINS?: string;
  }
}

/** Augment the module declaration for cloudflare:workers so env is typed correctly at compile time. */
declare module 'cloudflare:workers' {
  const env: Cloudflare.Env;
  export { env };
}
