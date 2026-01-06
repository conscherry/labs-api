import { fetch, Response } from 'undici';
import type { ApiResponse, Bot, UserSummary, StatRecord } from './types';

export interface LabsApiClientOptions {
  apiKey?: string;
  baseUrl?: string;
}

export class LabsApiClient {
  private apiKey?: string;
  private baseUrl: string;

  constructor(options: LabsApiClientOptions = {}) {
    this.apiKey = options.apiKey || process.env.LABS_API_KEY;
    this.baseUrl = options.baseUrl || 'https://labs.conscherry.com/api/v1';
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
    return headers;
  }
  /**
   * Post bot statistics (requires authentication)
   */
  async postStats(params: {
    botId: string;
    guildCount: number;
    userCount: number;
    shardCount?: number;
    uptime?: number;
    ping?: number;
    customFields?: Record<string, string | number>;
  }): Promise<ApiResponse<StatRecord>> {
    const url = `${this.baseUrl}/stats`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(params),
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
    return data;
  }
}
