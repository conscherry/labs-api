import { LabsApiClient } from '../src/client';
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
    // telemetry headers should be included by default
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
    // verify fetch was called with normalized body
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
});
