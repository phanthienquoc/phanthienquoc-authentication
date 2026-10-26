import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const REST_SCHEMA_PATH_CACHE_TTL_MS = 5 * 60 * 1000;

type PostgrestOpenApi = {
  paths?: Record<string, unknown>;
};

@Injectable()
export class SupabaseClientService {
  private readonly client: SupabaseClient;
  private schemaPathsCache?: { paths: ReadonlySet<string>; expiresAt: number };
  private schemaPathsRequest?: Promise<ReadonlySet<string>>;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }

    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  get db(): SupabaseClient {
    return this.client;
  }

  /**
   * Read PostgREST's OpenAPI document to validate the exposed RPC contract.
   * This is a GET-only metadata request using the same service-role credentials
   * as the shared Supabase client; it never invokes a database function.
   *
   * Successful schema paths are cached briefly because readiness is checked by
   * both health probes and the public auth-status endpoint. Concurrent callers
   * share one in-flight request; failures are never cached.
   */
  async getRestSchemaPaths(): Promise<ReadonlySet<string>> {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Supabase REST schema is not configured');
    }

    const now = Date.now();
    if (this.schemaPathsCache && this.schemaPathsCache.expiresAt > now) {
      return new Set(this.schemaPathsCache.paths);
    }
    if (this.schemaPathsRequest) {
      return new Set(await this.schemaPathsRequest);
    }

    const request = this.fetchRestSchemaPaths(url, key)
      .then((paths) => {
        this.schemaPathsCache = {
          paths,
          expiresAt: Date.now() + REST_SCHEMA_PATH_CACHE_TTL_MS,
        };
        return paths;
      })
      .finally(() => {
        this.schemaPathsRequest = undefined;
      });
    this.schemaPathsRequest = request;
    return new Set(await request);
  }

  private async fetchRestSchemaPaths(url: string, key: string): Promise<ReadonlySet<string>> {
    try {
      const response = await fetch(`${url.replace(/\/+$/, ''))}/rest/v1/`, {
        method: 'GET',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: 'application/openapi+json',
        },
      });
      if (!response.ok) throw new Error('Supabase REST schema request failed');

      const schema = (await response.json()) as PostgrestOpenApi;
      if (!schema.paths || typeof schema.paths !== 'object') {
        throw new Error('Supabase REST schema response is invalid');
      }
      return new Set(Object.keys(schema.paths));
    } catch {
      // Do not leak credentials, endpoint details, or raw schema errors.
      throw new Error('Unable to inspect Supabase REST schema');
    }
  }
}
