export function success<T>(data: T, meta?: Record<string, unknown>) {
  return {
    success: true as const,
    data,
    ...(meta ? { meta } : {}),
  };
}

export function failure(message: string, code?: string) {
  return {
    success: false as const,
    error: { message, ...(code ? { code } : {}) },
  };
}
