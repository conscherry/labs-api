# Changelog

All notable changes to this project will be documented in this file.

## [1.0.1] - 2026-01-06
- Initial public-ready release
- TypeScript client for Conscherry Labs API
- Public endpoints: list bots, get bot, list users, website stats
- Authenticated endpoints: post stats, get stats
- Error handling and rate limit messages
- Jest tests and GitHub Actions CI
- Prettier formatting and TypeScript build

## [1.0.2] - 2026-01-13
- Add SDK telemetry headers (enabled by default): `X-SDK-Name`, `X-SDK-Version`, `X-SDK-Lang` (optional platform/node headers available).
- Normalize stats payload aliases and responses (`serverCount`, `server_count` <-> `guildCount`) to improve compatibility with API variations.
