import { fetch, Response } from 'undici';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import type {
  ApiResponse,
  Bot,
  UserSummary,
  StatRecord,
  TelemetryOptions,
  PostStatsParams,
  ListBotsParams,
  ListUsersParams,
} from './types';
import {
  LabsAPIAuthError,
  LabsAPIPermissionError,
  LabsAPIRateLimitError,
  LabsAPIRequestError,
  LabsAPIConnectionError,
} from './exceptions';

export const DEFAULT_BASE_URL = 'https://labs.conscherry.com/api/v1';
export const DEFAULT_TIMEOUT = 15000;

export interface LabsApiClientOptions {
  apiKey?: string;
  baseUrl?: string;
  telemetry?: TelemetryOptions;
  timeout?: number;
}

type QueryParams = Record<string, string | number | boolean | undefined | null>;

let packageMeta: { name?: string; version?: string } | undefined;

function readPackageMeta(): { name?: string; version?: string } {
  if (packageMeta) return packageMeta;
  try {
    packageMeta = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as {
      name?: string;
      version?: string;
    };
  } catch {
    packageMeta = {};
  }
  return packageMeta;
}

function buildQuery(params: QueryParams = {}): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) search.append(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export class LabsApiClient {
  private apiKey?: string;
  private baseUrl: string;
  private telemetry: TelemetryOptions;
  private timeout: number;
  private instanceId: string;

  constructor(options: LabsApiClientOptions = {}) {
    this.apiKey = options.apiKey || process.env.LABS_API_KEY;
    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.telemetry = options.telemetry ?? { enabled: true };
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.instanceId = randomUUID();
  }

  private getHeaders(authRequired = false): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    if (authRequired) {
      if (!this.apiKey) {
        throw new LabsAPIAuthError(
          'labs-api: API key is required for this operation. Please provide your API key when creating the LabsApiClient or set the LABS_API_KEY environment variable.'
        );
      }
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    if (this.telemetry.enabled ?? true) {
      const pkg = readPackageMeta();
      headers['X-SDK-Name'] = this.telemetry.sdkName || pkg.name || 'labs-api';
      headers['X-SDK-Version'] = this.telemetry.sdkVersion || pkg.version || '0.0.0';
      headers['X-SDK-Lang'] = 'node';
      headers['X-SDK-Instance-Id'] = this.instanceId;
      if (this.telemetry.includePlatform) {
        headers['X-SDK-Platform'] = process.platform;
        headers['X-SDK-Node-Version'] = process.version;
      }
    }

    return headers;
  }

  private async request(
    method: 'GET' | 'POST',
    path: string,
    options: { params?: QueryParams; body?: unknown; authenticated?: boolean } = {}
  ): Promise<any> {
    if (!path.startsWith('/') || path.startsWith('//')) {
      throw new LabsAPIRequestError('labs-api: API path must start with one slash.');
    }
    if (path.includes('?') || path.includes('#') || path.includes('\\')) {
      throw new LabsAPIRequestError('labs-api: Pass query parameters through params.');
    }

    const url = `${this.baseUrl}${path}${buildQuery(options.params)}`;
    const headers = this.getHeaders(options.authenticated);

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: AbortSignal.timeout(this.timeout),
      });
    } catch (e: any) {
      if (e.name === 'TimeoutError' || e.name === 'AbortError') {
        throw new LabsAPIConnectionError(`labs-api: Request timed out after ${this.timeout}ms`, {
          response: e,
        });
      }
      throw new LabsAPIConnectionError(`labs-api: Connection error: ${e.message}`, {
        response: e,
      });
    }

    return this.handleResponse(res);
  }

  async get<T = any>(
    path: string,
    params?: QueryParams,
    authenticated = false
  ): Promise<ApiResponse<T>> {
    return this.request('GET', path, { params, authenticated });
  }

  async post<T = any>(
    path: string,
    body?: unknown,
    authenticated = false
  ): Promise<ApiResponse<T>> {
    return this.request('POST', path, { body, authenticated });
  }

  async postStats(params: PostStatsParams): Promise<ApiResponse<StatRecord>> {
    if (!params.botId) {
      throw new LabsAPIRequestError('labs-api: botId is required to post stats.');
    }

    const body: Record<string, unknown> = {
      botId: params.botId,
      guildCount: params.guildCount ?? params.serverCount ?? params.server_count,
      userCount: params.userCount,
      shardCount:
        params.shardCount ?? (Array.isArray(params.shards) ? params.shards.length : undefined),
      uptime: params.uptime,
      ping: params.ping,
      customFields: params.customFields,
    };
    Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

    return this.post('/stats', body, true);
  }

  async getStats(params: { botId: string; limit?: number }): Promise<ApiResponse<StatRecord[]>> {
    if (!params.botId) {
      throw new LabsAPIRequestError('labs-api: botId is required to get stats.');
    }
    return this.get('/stats', { botId: params.botId, limit: params.limit }, true);
  }

  async listBots(params: ListBotsParams = {}): Promise<ApiResponse<Bot[]>> {
    return this.get('/bots', params as QueryParams);
  }

  async getBotById(id: string): Promise<ApiResponse<Bot>> {
    if (!id) {
      throw new LabsAPIRequestError('labs-api: id is required to get a bot.');
    }
    return this.get(`/bots/${encodeURIComponent(id)}`);
  }

  async listUsers(params: ListUsersParams = {}): Promise<ApiResponse<UserSummary[]>> {
    return this.get('/users', params as QueryParams);
  }

  async getWebsiteStats(): Promise<ApiResponse<any>> {
    return this.get('/website');
  }

  private async handleResponse(res: Response): Promise<any> {
    let data: any;
    try {
      data = await res.json();
    } catch (e) {
      if (res.ok && res.status === 204) return undefined;
      if (!res.ok) {
        return this.throwForStatus(res, undefined);
      }
      throw new LabsAPIConnectionError('labs-api: Invalid JSON response from API.');
    }

    if (!res.ok || data?.success === false) {
      return this.throwForStatus(res, data);
    }

    const normalize = (obj: any) => {
      if (!obj || typeof obj !== 'object') return obj;
      const copy = { ...obj };
      const value = copy.guildCount ?? copy.serverCount ?? copy.server_count;
      if (value !== undefined) {
        copy.guildCount = value;
        copy.serverCount = value;
        copy.server_count = value;
      }
      return copy;
    };

    if (data && data.data) {
      if (Array.isArray(data.data)) data.data = data.data.map(normalize);
      else if (typeof data.data === 'object') data.data = normalize(data.data);
    }

    return data;
  }

  private throwForStatus(res: Response, data: any): never {
    const statusCode = data?.statusCode || res.status;
    const code = data?.code || res.status;
    const message = data?.error || data?.message || res.statusText;

    if (res.status === 401) {
      throw new LabsAPIAuthError('labs-api: Unauthorized. Please check your API key.', {
        statusCode,
        code,
        response: data,
      });
    }
    if (res.status === 403) {
      throw new LabsAPIPermissionError(
        'labs-api: Forbidden. You do not have permission for this action.',
        { statusCode, code, response: data }
      );
    }
    if (res.status === 429) {
      throw new LabsAPIRateLimitError('labs-api: Rate limit exceeded. Please wait before retrying.', {
        statusCode,
        code,
        retryAfter: Number(res.headers.get('Retry-After')) || undefined,
        response: data,
      });
    }
    throw new LabsAPIRequestError(message, { statusCode, code, response: data });
  }
}
