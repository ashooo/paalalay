/**
 * Common tool protocol contracts and response envelope shapes.
 * Frozen baseline: 9 October 2026 (Dev 1, Dev 2, Dev 3, Dev 4 agreement)
 */

export type ToolStatus = 'success' | 'error';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'CANCELLED'
  | 'INTERNAL_ERROR';

export interface ToolError {
  code: ErrorCode;
  message: string;
}

export interface ToolResponse<T = unknown> {
  status: ToolStatus;
  data?: T;
  error?: ToolError;
}

export function createSuccessResponse<T>(data: T): ToolResponse<T> {
  return {
    status: 'success',
    data,
  };
}

export function createErrorResponse(code: ErrorCode, message: string): ToolResponse<never> {
  return {
    status: 'error',
    error: {
      code,
      message,
    },
  };
}
