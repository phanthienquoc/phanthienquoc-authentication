import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type PostgrestOpenApi = {
  paths?: Record<string, unknown>;
};

@Injectable()
export class SupabaseClientService {
  private readonly client: SupabaseClient;

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
   */
  async getRestSchemaPaths(): Promise<ReadonlySet<string>> {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Supabase REST schema is not configured');
    }

    try {
      const response = await fetch(`${url.replace(/\/+$/, '')}/rest/v1/`, {
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
