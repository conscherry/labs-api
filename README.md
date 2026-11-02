# Discord Labs API

A user-friendly Node.js/TypeScript client for the Conscherry Labs API. This package makes it simple to fetch public data (bots, users, website stats) and post authenticated bot statistics.

[![npm version](https://img.shields.io/npm/v/%40conscherry%2Flabs-api.svg)](https://www.npmjs.com/package/@conscherry/labs-api) [![npm downloads](https://img.shields.io/npm/dm/%40conscherry%2Flabs-api.svg)](https://www.npmjs.com/package/@conscherry/labs-api) [![build](https://img.shields.io/github/actions/workflow/status/conscherry/labs-api/ci.yml?branch=main)](https://github.com/conscherry/labs-api/actions) [![license](https://img.shields.io/github/license/conscherry/labs-api.svg)](LICENSE) [![GitHub stars](https://img.shields.io/github/stars/conscherry/labs-api?style=social)](https://github.com/conscherry/labs-api/stargazers) [![codecov](https://img.shields.io/codecov/c/gh/conscherry/labs-api.svg)](https://codecov.io/gh/conscherry/labs-api)

## Links

- [Conscherry](https://conscherry.com/)
- [Discord Labs](https://labs.conscherry.com/)
- [Labs API Documentation](https://labs.conscherry.com/developers/docs/v1)
- [Labs API Source](https://github.com/conscherry/labs-api)
- [Python SDK on PyPI](https://pypi.org/project/labs-api-python/)

## Features

- Simple API for public and authenticated endpoints
- TypeScript definitions included
- Robust error handling with dedicated exception classes
- Built-in request timeouts to prevent hanging calls
- Automatic response normalization for server count aliases
- Generic `get` / `post` helpers for future endpoints
- Configurable `baseUrl` and `timeout`
- Node.js only (uses `undici` and `fs`); requires Node.js 20.18 or newer

## Installation

```bash
npm install @conscherry/labs-api
```

## Quick start

1. Set your API key (for authenticated endpoints)

- Recommended: create a `.env` file and set `LABS_API_KEY=sk_...`.
- Install dotenv for local development and load it at process start:

```bash
npm install dotenv
```

```js
require('dotenv').config();
// process.env.LABS_API_KEY is now available
```

- Or pass the key to the client directly.

2. Use the client

JavaScript (CommonJS):

```js
const { LabsApiClient } = require('@conscherry/labs-api');
const client = new LabsApiClient(); // uses process.env.LABS_API_KEY if present

(async () => {
  const bots = await client.listBots({ limit: 5 });
  console.log(bots.data);
})();
```

TypeScript:

```ts
import { LabsApiClient } from '@conscherry/labs-api';
import type { Bot } from '@conscherry/labs-api';

const client = new LabsApiClient({ apiKey: process.env.LABS_API_KEY });

async function main() {
  const result = await client.listBots({ limit: 5 });
  const bots = result.data as Bot[];
  console.log(bots[0]?.name);
}

main();
```

## Examples

List bots (public):

```js
const client = new LabsApiClient();
const res = await client.listBots({ limit: 10, sort: '-votes' });
console.log(res.data);
```

Get a bot by ID (public):

```js
const res = await client.getBotById('123456789012345678');
console.log(res.data);
```

Post bot stats (authenticated — requires `write:stats` permission):

```js
const client = new LabsApiClient();
// Supports guildCount, serverCount, and server_count aliases
await client.postStats({ botId: 'BOT_ID', serverCount: 1000, userCount: 5000 });
```

Generic request (for new endpoints):

```js
// GET /custom
const res = await client.get('/custom', { q: 'search' }, false);

// POST /admin (requires auth)
await client.post('/admin', { action: 'rebuild' }, true);
```

Example scripts (built to `dist/`):

- `examples/simple.js` — basic public website stats example (opt-out telemetry shown)
- `examples/post-stats.js` — authenticated `postStats` example using `serverCount` alias
- `examples/telemetry-enabled.js` — enable telemetry and override SDK metadata
- `examples/generic-request.js` — call an endpoint through the generic `get` helper

Run an example after building:

```bash
npm run build
node examples/post-stats.js
```

## API overview (what this client exposes)

Public endpoints (no API key required):

- `listBots(params?)` — GET `/bots` (params: `limit`, `offset`, `sort`, `search`, `category`, `certified`, `verified`, `nsfw`)
- `getBotById(id)` — GET `/bots/:id` (the id is URL-encoded)
- `listUsers(params?)` — GET `/users` (params: `limit`, `offset`, `sort`, `search`)
- `getWebsiteStats()` — GET `/website`

Authenticated endpoints (API key required):

- `postStats(body)` — POST `/stats` (body: `botId`, `guildCount`, `userCount`, `shardCount`, `uptime`, `ping`, `customFields`)
- `getStats(params)` — GET `/stats` (params: `botId` required, `limit` optional)

All other documented endpoints are available via the generic `get(path, params?, authenticated?)` and `post(path, body?, authenticated?)` helpers. Paths must start with a single `/` and must not contain a query string; pass query values through `params`.

## Client options

| Option | Type | Default |
| --- | --- | --- |
| `apiKey` | `string` | `process.env.LABS_API_KEY` |
| `baseUrl` | `string` | `https://labs.conscherry.com/api/v1` |
| `timeout` | `number` (ms) | `15000` |
| `telemetry` | `{ enabled?, sdkName?, sdkVersion?, includePlatform? }` | `{ enabled: true }` |

## Authentication

- Provide your API key either by passing `{ apiKey: 'sk_...' }` to `LabsApiClient` or by setting `LABS_API_KEY` in the environment.
- See the official API docs for details and key management: https://labs.conscherry.com/developers/docs
- The client will throw a clear error if you attempt an authenticated call without a key.

## Telemetry

- This client sends a small set of telemetry headers by default to identify the SDK and runtime to your API (headers: `X-SDK-Name`, `X-SDK-Version`, `X-SDK-Lang`, and `X-SDK-Instance-Id`; `X-SDK-Platform` and `X-SDK-Node-Version` are added when `includePlatform` is true).
- To customize or disable telemetry, pass the `telemetry` option when creating the client, for example: `new LabsApiClient({ telemetry: { enabled: false } })` or override `sdkName` / `sdkVersion`. `X-SDK-Instance-Id` is a random UUID generated once per client.
  - Example: opt-out of telemetry

```js
const client = new LabsApiClient({ telemetry: { enabled: false } });
```

## Rate limits & best practices

- Standard rate limits: ~100 requests/minute (headers `X-RateLimit-*` are provided).
- Posting stats: allowed once per bot every 5 minutes. Exceeding returns 429 with `Retry-After` (seconds).
- Best practices:
  - Store keys in env vars, not in code.
  - Respect `Retry-After` on 429 responses.
  - Cache responses when appropriate.

## Error handling

The client throws specific exception classes for different API errors. `LabsAPIError` is the base class; `LabsAPIAuthError` covers 401 or a missing key, `LabsAPIPermissionError` covers 403, `LabsAPIRateLimitError` covers 429, `LabsAPIRequestError` covers other HTTP errors and `LabsAPIConnectionError` covers timeouts, network failures and invalid JSON. Every error exposes `statusCode`, `code`, `retryAfter` and `response`.

```js
const { LabsAPIAuthError, LabsAPIRateLimitError } = require('@conscherry/labs-api');

try {
  await client.getStats({ botId: '...' });
} catch (err) {
  if (err instanceof LabsAPIAuthError) {
    console.error('Authentication failed');
  } else if (err instanceof LabsAPIRateLimitError) {
    console.error('Rate limited. Retry after:', err.retryAfter);
  } else {
    console.error('API Error:', err.message);
  }
}
```

## Development & tests

- Format: `npm run format`
- Build: `npm run build`
- Tests: `npm run test`
- Example: after build run `node examples/simple.js` to try the example.

## Publishing checklist

- Bump `version` in `package.json`.
- Build: `npm run build`.
- Verify package: `npm pack --dry-run`.
- Test prepublish: `npm run test`.
- Publish: `npm login` then `npm publish --access public`.

## Contributing

PRs welcome — please open issues for bugs or feature requests.

## License

MIT
