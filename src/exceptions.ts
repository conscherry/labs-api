export class LabsAPIError extends Error {
  public statusCode?: number;
  public code?: string | number;
  public retryAfter?: number;
  public response?: any;

  constructor(message: string, options: {
    statusCode?: number;
    code?: string | number;
    retryAfter?: number;
    response?: any;
  } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.retryAfter = options.retryAfter;
    this.response = options.response;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class LabsAPIAuthError extends LabsAPIError {}
export class LabsAPIPermissionError extends LabsAPIError {}
export class LabsAPIRateLimitError extends LabsAPIError {}
export class LabsAPIRequestError extends LabsAPIError {}
export class LabsAPIConnectionError extends LabsAPIError {}
