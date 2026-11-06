import { LabsApiClient } from '../src/client';
import {
  LabsAPIAuthError,
  LabsAPIConnectionError,
  LabsAPIError,
  LabsAPIRateLimitError,
  LabsAPIRequestError,
} from '../src/exceptions';
const pkg = require('../package.json');

jest.mock('undici', () => ({
  fetch: jest.fn(),
}));
import { fetch as mockFetch } from 'undici';

describe('LabsApiClient', () => {
  beforeEach(() => {
    (mockFetch as jest.MockedFunction<any>).mockReset();
  });

  test('listBots parses response', async () => {
    const mockData = { success: true, data: [{ id: '1', name: 'Bot' }] };
    (mockFetch as jest.MockedFunction<any>).mockResolvedValue({ ok: true, status: 200, json: async () => mockData });

    const client = new LabsApiClient({ baseUrl: 'https://labs.conscherry.com/api/v1' });
    const res = await client.listBots({ limit: 1 });
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(1);
    expect(res.data![0].id).toBe('1');
    const callArgs = (mockFetch as jest.MockedFunction<any>).mock.calls[0];
    const headers = callArgs[1].headers;
    expect(headers['X-SDK-Name']).toBe(pkg.name);
    expect(headers['X-SDK-Version']).toBe(pkg.version);
  });

  test('postStats normalizes input aliases and sends canonical body', async () => {
    const mockData = { success: true, data: { botId: 'b1', guildCount: 10 } };
    (mockFetch as jest.MockedFunction<any>).mockResolvedValue({ ok: true, status: 200, json: async () => mockData });

    const client = new LabsApiClient({ apiKey: 'sk_test', baseUrl: 'https://labs.conscherry.com/api/v1' });
    const res = await client.postStats({ botId: 'b1', serverCount: 10, userCount: 100 });
    expect(res.success).toBe(true);
    const callArgs = (mockFetch as jest.MockedFunction<any>).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.guildCount).toBe(10);
    expect(body.serverCount).toBeUndefined();
  });

  test('getStats normalizes response shapes', async () => {
    const mockData = { success: true, data: [{ botId: 'b1', server_count: 5 }] };
    (mockFetch as jest.MockedFunction<any>).mockResolvedValue({ ok: true, status: 200, json: async () => mockData });

    const client = new LabsApiClient({ apiKey: 'sk_test', baseUrl: 'https://labs.conscherry.com/api/v1' });
    const res = await client.getStats({ botId: 'b1' });
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data![0].guildCount).toBe(5);
    expect(res.data![0].serverCount).toBe(5);
    expect(res.data![0].server_count).toBe(5);
  });

  const okResponse = (data: unknown = { success: true, data: [] }) => ({
    ok: true,
    status: 200,
    json: async () => data,
  });

  const errorResponse = (status: number, body: unknown = {}, headers: Record<string, string> = {}) => ({
    ok: false,
    status,
    statusText: 'Error',
    headers: { get: (name: string) => headers[name] ?? null },
    json: async () => body,
  });

  const lastCall = () => {
    const calls = (mockFetch as jest.MockedFunction<any>).mock.calls;
    return calls[calls.length - 1];
  };

  test('get appends only defined query params', async () => {
    (mockFetch as jest.MockedFunction<any>).mockResolvedValue(okResponse());
    const client = new LabsApiClient({ baseUrl: 'https://labs.conscherry.com/api/v1/' });
    await client.get('/bots', { limit: 2, sort: undefined, nsfw: false });
    expect(lastCall()[0]).toBe('https://labs.conscherry.com/api/v1/bots?limit=2&nsfw=false');
    expect(lastCall()[1].method).toBe('GET');
  });

  test('post sends a bearer token and JSON body when authenticated', async () => {
    (mockFetch as jest.MockedFunction<any>).mockResolvedValue(okResponse());
    const client = new LabsApiClient({ apiKey: 'sk_test' });
    await client.post('/stats', { botId: 'b1', guildCount: 3 }, true);
    expect(lastCall()[1].method).toBe('POST');
    expect(lastCall()[1].headers.Authorization).toBe('Bearer sk_test');
    expect(JSON.parse(lastCall()[1].body)).toEqual({ botId: 'b1', guildCount: 3 });
  });

  test('getBotById encodes the id', async () => {
    (mockFetch as jest.MockedFunction<any>).mockResolvedValue(okResponse({ success: true, data: {} }));
    const client = new LabsApiClient();
    await client.getBotById('a/b');
    expect(lastCall()[0]).toContain('/bots/a%2Fb');
  });

  test('rejects paths that contain a query string', async () => {
    const client = new LabsApiClient();
    await expect(client.get('/bots?limit=1')).rejects.toBeInstanceOf(LabsAPIRequestError);
  });

  test('authenticated calls without a key throw LabsAPIAuthError', async () => {
    const saved = process.env.LABS_API_KEY;
    delete process.env.LABS_API_KEY;
    try {
      const client = new LabsApiClient();
      await expect(client.getStats({ botId: 'b1' })).rejects.toBeInstanceOf(LabsAPIAuthError);
    } finally {
      if (saved !== undefined) process.env.LABS_API_KEY = saved;
    }
  });

  test('401 responses throw LabsAPIAuthError', async () => {
    (mockFetch as jest.MockedFunction<any>).mockResolvedValue(errorResponse(401));
    const client = new LabsApiClient({ apiKey: 'sk_test' });
    const err = await client.getStats({ botId: 'b1' }).catch((e) => e);
    expect(err).toBeInstanceOf(LabsAPIAuthError);
    expect(err).toBeInstanceOf(LabsAPIError);
    expect(err.statusCode).toBe(401);
  });

  test('429 responses expose retryAfter', async () => {
    (mockFetch as jest.MockedFunction<any>).mockResolvedValue(
      errorResponse(429, { error: 'slow down' }, { 'Retry-After': '7' })
    );
    const client = new LabsApiClient({ apiKey: 'sk_test' });
    const err = await client.postStats({ botId: 'b1', guildCount: 1 }).catch((e) => e);
    expect(err).toBeInstanceOf(LabsAPIRateLimitError);
    expect(err.retryAfter).toBe(7);
  });

  test('network failures throw LabsAPIConnectionError', async () => {
    (mockFetch as jest.MockedFunction<any>).mockRejectedValue(new Error('boom'));
    const client = new LabsApiClient();
    await expect(client.listBots()).rejects.toBeInstanceOf(LabsAPIConnectionError);
  });

  test('telemetry sends a stable instance id and can be disabled', async () => {
    (mockFetch as jest.MockedFunction<any>).mockResolvedValue(okResponse());
    const client = new LabsApiClient();
    await client.listBots();
    const first = lastCall()[1].headers['X-SDK-Instance-Id'];
    await client.listBots();
    expect(first).toBeTruthy();
    expect(lastCall()[1].headers['X-SDK-Instance-Id']).toBe(first);
    expect(lastCall()[1].headers['X-SDK-Lang']).toBe('node');

    const quiet = new LabsApiClient({ telemetry: { enabled: false } });
    await quiet.listBots();
    expect(lastCall()[1].headers['X-SDK-Name']).toBeUndefined();
  });
});
