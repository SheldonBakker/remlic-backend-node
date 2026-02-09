import type { z } from 'zod';
import { HttpError } from '../types/errors/appError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { formatValidationError } from './validationFormatter.js';

export function validateOrThrow<T extends z.ZodType<unknown, z.ZodTypeDef, unknown>>(
  schema: T,
  data: unknown,
  errorMessage = 'Validation failed',
): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = formatValidationError(result.error);
    throw new HttpError(
      HTTP_STATUS.BAD_REQUEST,
      errorMessage,
      errors,
    );
  }
  return result.data as z.output<T>;
}

export function validateIdOrThrow(
  schema: z.ZodString,
  id: unknown,
  errorMessage: string,
): string {
  const result = schema.safeParse(id);
  if (!result.success) {
    throw new HttpError(
      HTTP_STATUS.BAD_REQUEST,
      errorMessage,
    );
  }
  return result.data;
}
