import { LabsApiClient } from '../src/client';

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
  });
});
