export interface IPagination {
  nextCursor: string | null;
}

export interface IApiResponse<T> {
  success: true;
  data: T;
  pagination: IPagination | null;
  timestamp: string;
  statusCode: number;
}

export interface IApiErrorResponse {
  success: false;
  error: string;
  details: unknown | null;
  timestamp: string;
  statusCode: number;
}

export interface IErrorResponse {
  success: false;
  error: {
    message: string;
    statusCode: number;
    timestamp: string;
    path: string;
  };
}

export interface IPageResult<T> {
  data: T[];
  nextCursor: IPagination['nextCursor'];
}
