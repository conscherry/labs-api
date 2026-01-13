import { fetch, Response } from 'undici';
import { readFileSync } from 'fs';
import { join } from 'path';
import type {
  ApiResponse,
  Bot,
  UserSummary,
  StatRecord,
  TelemetryOptions,
  PostStatsParams,
} from './types';

export interface LabsApiClientOptions {
  apiKey?: string;
  baseUrl?: string;
  telemetry?: TelemetryOptions;
}

export class LabsApiClient {
  private apiKey?: string;
  private baseUrl: string;
  private telemetry?: TelemetryOptions;

  constructor(options: LabsApiClientOptions = {}) {
    this.apiKey = options.apiKey || process.env.LABS_API_KEY;
    this.baseUrl = options.baseUrl || 'https://labs.conscherry.com/api/v1';
    // telemetry: enabled by default for this project; users may override to opt-out
    this.telemetry = options.telemetry ?? { enabled: true };
  }

  private getHeaders(authRequired = false): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authRequired) {
      if (!this.apiKey) {
        throw new Error(
          'labs-api: API key is required for this operation. Please provide your API key when creating the LabsApiClient or set the LABS_API_KEY environment variable.'
        );
      }
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    // attach telemetry headers when enabled
    try {
      const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as {
        name?: string;
        version?: string;
      };
      const telemetryEnabled = this.telemetry?.enabled ?? true;
      if (telemetryEnabled) {
        headers['X-SDK-Name'] = this.telemetry?.sdkName || pkg.name || 'labs-api';
        headers['X-SDK-Version'] = this.telemetry?.sdkVersion || pkg.version || '0.0.0';
        headers['X-SDK-Lang'] = 'node';
        if (this.telemetry?.includePlatform) {
          headers['X-SDK-Platform'] = process.platform;
          headers['X-SDK-Node-Version'] = process.version;
        }
      }
    } catch (e) {
      // ignore package read errors; telemetry will fall back to minimal defaults
    }
    return headers;
  }
  /**
   * Post bot statistics (requires authentication)
   */
  async postStats(params: PostStatsParams): Promise<ApiResponse<StatRecord>> {
    const url = `${this.baseUrl}/stats`;
    // normalize input aliases into canonical shape
    const body: any = {
      botId: params.botId,
      guildCount: params.guildCount ?? params.serverCount ?? params.server_count,
      userCount: params.userCount,
      shardCount:
        params.shardCount ?? (Array.isArray(params.shards) ? params.shards.length : undefined),
      uptime: params.uptime,
      ping: params.ping,
      customFields: params.customFields,
    };
    // strip undefined props
    Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(body),
    });
    return this.handleResponse(res);
  }

  /**
   * Get bot statistics (requires authentication)
   */
  async getStats(params: { botId: string; limit?: number }): Promise<ApiResponse<StatRecord[]>> {
    if (!params.botId) {
      throw new Error('labs-api: botId is required to get stats.');
    }
    const url = new URL(`${this.baseUrl}/stats`);
    url.searchParams.append('botId', params.botId);
    if (params.limit !== undefined) {
      url.searchParams.append('limit', String(params.limit));
    }
    const res = await fetch(url.toString(), {
      headers: this.getHeaders(true),
    });
    return this.handleResponse(res);
  }

  /**
   * List bots with optional query parameters
   */
  async listBots(
    params: {
      limit?: number;
      offset?: number;
      sort?: string;
      search?: string;
      category?: string;
      certified?: boolean;
      verified?: boolean;
      nsfw?: boolean;
    } = {}
  ): Promise<ApiResponse<Bot[]>> {
    const url = new URL(`${this.baseUrl}/bots`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.append(key, String(value));
    });
    const res = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  /**
   * Get a bot by its Discord client ID
   */
  async getBotById(id: string): Promise<ApiResponse<Bot>> {
    const url = `${this.baseUrl}/bots/${id}`;
    const res = await fetch(url, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  /**
   * List users with optional query parameters
   */
  async listUsers(
    params: {
      limit?: number;
      offset?: number;
      sort?: string;
      search?: string;
    } = {}
  ): Promise<ApiResponse<UserSummary[]>> {
    const url = new URL(`${this.baseUrl}/users`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.append(key, String(value));
    });
    const res = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  /**
   * Get public website statistics
   */
  async getWebsiteStats(): Promise<ApiResponse<any>> {
    const url = `${this.baseUrl}/website`;
    const res = await fetch(url, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  /**
   * Handle API responses, throw on error
   */
  private async handleResponse(res: Response): Promise<any> {
    let data: any;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error('labs-api: Invalid JSON response from API.');
    }
    if (!res.ok || data.success === false) {
      let message = data?.error || res.statusText;
      if (res.status === 401) {
        message = 'labs-api: Unauthorized. Please check your API key.';
      } else if (res.status === 429) {
        message = 'labs-api: Rate limit exceeded. Please wait before retrying.';
      }
      const error = new Error(message);
      (error as any).code = data.code || res.status;
      (error as any).statusCode = data.statusCode || res.status;
      throw error;
    }
    // normalize stat records (aliases) for consumers
    const normalize = (obj: any) => {
      if (!obj || typeof obj !== 'object') return obj;
      const copy = { ...obj };
      if (copy.guildCount === undefined) {
        if (copy.serverCount !== undefined) copy.guildCount = copy.serverCount;
        else if (copy.server_count !== undefined) copy.guildCount = copy.server_count;
      }
      if (copy.serverCount === undefined) {
        if (copy.guildCount !== undefined) copy.serverCount = copy.guildCount;
        else if (copy.server_count !== undefined) copy.serverCount = copy.server_count;
      }
      if (copy.server_count === undefined) {
        if (copy.guildCount !== undefined) copy.server_count = copy.guildCount;
        else if (copy.serverCount !== undefined) copy.server_count = copy.serverCount;
      }
      return copy;
    };

    if (data && data.data) {
      if (Array.isArray(data.data)) data.data = data.data.map(normalize);
      else if (typeof data.data === 'object') data.data = normalize(data.data);
    }

    return data;
  }
}
