import type { Context } from "hono";

type SuccessStatus = 200 | 201 | 204;
type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 500;

export function successResponse<T>(
  c: Context,
  message: string,
  data: T,
  status: SuccessStatus = 200,
) {
  if (status === 204) return c.body(null, 204);

  return c.json(
    {
      success: true,
      message,
      data,
      status,
    },
    status,
  );
}

export function errorResponse(c: Context, message: string, status: ErrorStatus) {
  return c.json(
    {
      success: false,
      message,
      status,
    },
    status,
  );
}
