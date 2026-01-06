# Discord Labs API

A user-friendly Node.js/TypeScript client for the Conscherry Labs API. This package makes it simple to fetch public data (bots, users, website stats) and post authenticated bot statistics.

[![npm version](https://img.shields.io/npm/v/labs-api.svg)](https://www.npmjs.com/package/labs-api) [![build](https://img.shields.io/github/actions/workflow/status/conscherry/labs-api/ci.yml?branch=main)](https://github.com/conscherry/labs-api/actions) [![license](https://img.shields.io/npm/l/labs-api.svg)](LICENSE)

## Features

- Simple API for public and authenticated endpoints
- TypeScript definitions included
- Handles authentication, helpful errors, and rate-limit messages
- Generic `get` / `post` helpers for future endpoints

## Installation

```bash
npm install labs-api
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
const { LabsApiClient } = require('labs-api');
const client = new LabsApiClient(); // uses process.env.LABS_API_KEY if present

(async () => {
  const bots = await client.listBots({ limit: 5 });
  console.log(bots.data);
})();
```

TypeScript:

```ts
import { LabsApiClient } from 'labs-api';
import type { Bot } from './src/types';

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
await client.postStats({ botId: 'BOT_ID', guildCount: 1000, userCount: 5000 });
```

Generic request (for new endpoints):

```js
// GET /custom
const res = await client.get('/custom', { q: 'search' }, false);

// POST /admin (requires auth)
await client.post('/admin', { action: 'rebuild' }, true);
```

## API overview (what this client exposes)

Public endpoints (no API key required):

- `listBots(params?)` — GET `/bots` (params: `limit`, `offset`, `sort`, `search`, `category`, `certified`, `verified`, `nsfw`)
- `getBotById(id)` — GET `/bots/:id`
- `listUsers(params?)` — GET `/users` (params: `limit`, `offset`, `sort`, `search`)
- `getWebsiteStats()` — GET `/website`

Authenticated endpoints (API key required):

- `postStats(body)` — POST `/stats` (body: `botId`, `guildCount`, `userCount`, `shardCount`, `uptime`, `ping`, `customFields`)
- `getStats(params)` — GET `/stats` (params: `botId` required, `limit` optional)

All other documented endpoints are available via the generic `get` and `post` helpers.

## Authentication

- Provide your API key either by passing `{ apiKey: 'sk_...' }` to `LabsApiClient` or by setting `LABS_API_KEY` in the environment.
- See the official API docs for details on permissions and key management: https://labs.conscherry.com/developers/docs
- The client will throw a clear error if you attempt an authenticated call without a key.

## Rate limits & best practices

- Standard rate limits: ~100 requests/minute (headers `X-RateLimit-*` are provided).
- Posting stats: allowed once per bot every 5 minutes. Exceeding returns 429 with `Retry-After` (seconds).
- Best practices:
  - Store keys in env vars, not in code.
  - Respect `Retry-After` on 429 responses.
  - Cache responses when appropriate.

## Error handling

The client throws `Error` with descriptive messages. Common messages:

- `labs-api: API key is required...` — you called an authenticated endpoint without an API key.
- `labs-api: Unauthorized. Please check your API key.` — 401 from server.
- `labs-api: Rate limit exceeded. Please wait before retrying.` — 429 from server.
- `labs-api: Invalid JSON response from API.` — unexpected server response.

Inspect `.code` and `.statusCode` properties on thrown errors for programmatic handling.

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
