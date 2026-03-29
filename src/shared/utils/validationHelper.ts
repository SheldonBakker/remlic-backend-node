import type { z } from 'zod';
import { HttpError } from '../types/errors/appError';
import { HTTP_STATUS } from '../constants/httpStatus';
import { formatValidationError } from './validationFormatter';

export function validateOrThrow<O>(
  schema: z.ZodType<O>,
  data: unknown,
  errorMessage = 'Validation failed',
): O {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = formatValidationError(result.error);
    throw new HttpError(
      HTTP_STATUS.BAD_REQUEST,
      errorMessage,
      errors,
    );
  }
  return result.data;
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
