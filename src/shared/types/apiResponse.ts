export interface IPagination {
  nextCursor?: {
    created_at: string;
    id: string;
  } | null;
}

export interface IApiResponse<T> {
  success: true;
  data: T;
  pagination?: IPagination;
  timestamp: string;
  statusCode: number;
}

export interface IApiErrorResponse {
  success: false;
  error: string;
  details?: unknown;
  timestamp: string;
  statusCode: number;
}

export interface IPageResult<T> {
  data: T[];
  nextCursor: IPagination['nextCursor'];
}
