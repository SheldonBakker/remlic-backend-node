import { z } from 'zod';
import type { IPagination } from '../types/apiResponse.js';

export interface ICursorParams {
  cursor?: string;
  limit: number;
}

export interface IPaginatedResult<T> {
  items: T[];
  pagination: IPagination;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const cursorSchema = z.object({
  created_at: z.string().datetime(),
  id: z.string().uuid(),
});

const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional(),
});

export class PaginationUtil {
  public static parseQuery(query: unknown): ICursorParams {
    const result = paginationQuerySchema.safeParse(query);
    if (!result.success) {
      return { limit: DEFAULT_LIMIT };
    }
    return {
      cursor: result.data.cursor,
      limit: result.data.limit ?? DEFAULT_LIMIT,
    };
  }

  public static decodeCursor(cursor: string | undefined): { created_at: string; id: string } | null {
    if (!cursor) {
      return null;
    }

    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
      const result = cursorSchema.safeParse(decoded);
      return result.success ? result.data : null;
    } catch {
      return null;
    }
  }

  public static encodeCursor(created_at: string, id: string): string {
    return Buffer.from(JSON.stringify({ created_at, id })).toString('base64');
  }

  public static buildPagination<T extends { created_at: string; id: string }>(
    items: T[],
    limit: number,
  ): IPagination {
    const lastItem = items[items.length - 1];
    if (!lastItem || items.length < limit) {
      return { nextCursor: null };
    }

    return {
      nextCursor: {
        created_at: lastItem.created_at,
        id: lastItem.id,
      },
    };
  }
}
