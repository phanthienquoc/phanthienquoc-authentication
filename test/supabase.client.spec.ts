import { SupabaseClientService } from '../src/db/supabase.client';

describe('SupabaseClientService.getRestSchemaPaths', () => {
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  it('uses a GET-only OpenAPI request with the shared service-role credentials', async () => {
    process.env.SUPABASE_URL = 'https://supabase.example/';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        paths: {
          '/rpc/auth_rotate_refresh_session': {},
          '/rpc/auth_replace_mfa_recovery_codes': {},
        },
      }),
    } as Response);
    const service = new SupabaseClientService();

    const paths = await service.getRestSchemaPaths();

    expect(paths.has('/rpc/auth_rotate_refresh_session')).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://supabase.example/rest/v1/');
    expect(init?.method).toBe('GET');
    expect(init?.headers).toEqual({
      apikey: 'service-role-test-key',
      Authorization: 'Bearer service-role-test-key',
      Accept: 'application/openapi+json',
    });
  });

  it('does not return raw response details when the schema endpoint fails', async () => {
    process.env.SUPABASE_URL = 'https://supabase.example';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);
    const service = new SupabaseClientService();

    await expect(service.getRestSchemaPaths()).rejects.toThrow(
      'Unable to inspect Supabase REST schema',
    );
  });
  it('caches successful schema paths for five minutes and refreshes after expiry', async () => {
    process.env.SUPABASE_URL = 'https://supabase.example';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
    let now = 1_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ paths: { '/rpc/auth_rotate_refresh_session': {} } }),
    } as Response);
    const service = new SupabaseClientService();

    await service.getRestSchemaPaths();
    now += 4 * 60 * 1000;
    await service.getRestSchemaPaths();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    now += 2 * 60 * 1000;
    await service.getRestSchemaPaths();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not cache failed schema requests', async () => {
    process.env.SUPABASE_URL = 'https://supabase.example';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
    const fetchMock = jest.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ paths: { '/rpc/auth_rotate_refresh_session': {} } }),
      } as Response);
    const service = new SupabaseClientService();

    await expect(service.getRestSchemaPaths()).rejects.toThrow('Unable to inspect Supabase REST schema');
    const paths = await service.getRestSchemaPaths();

    expect(paths.has('/rpc/auth_rotate_refresh_session')).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
