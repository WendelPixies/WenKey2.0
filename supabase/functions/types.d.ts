// Minimal types to make editors happy when working on Supabase edge functions.
type EdgeHandler = (request: Request) => Response | Promise<Response>;

declare namespace Deno {
  const env: {
    get(key: string): string | undefined;
  };

  function serve(
    handler: EdgeHandler,
    options?: {
      port?: number;
      hostname?: string;
      signal?: AbortSignal;
      onListen?: (params: { hostname: string; port: number }) => void;
    }
  ): unknown;
}

declare module 'https://esm.sh/@supabase/supabase-js@2.76.1' {
  export * from '@supabase/supabase-js';
}
