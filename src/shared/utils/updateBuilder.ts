export function buildPartialUpdate<T extends object, K extends keyof T>(
  source: T,
  fields: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;

  for (const field of fields) {
    if (source[field] !== undefined) {
      result[field] = source[field];
    }
  }

  return result;
}
