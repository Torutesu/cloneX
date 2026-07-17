import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const Errors = {
  unauthorized: () => new ApiError(401, "UNAUTHORIZED", "認証が必要です"),
  invalidCredentials: () => new ApiError(401, "INVALID_CREDENTIALS", "メールまたはパスワードが違います"),
  noWorkspace: () => new ApiError(404, "NO_WORKSPACE", "ワークスペースが見つかりません"),
  notFound: (what = "リソース") => new ApiError(404, "NOT_FOUND", `${what}が見つかりません`),
  validation: (message: string) => new ApiError(400, "VALIDATION_ERROR", message),
  conflict: (message: string) => new ApiError(409, "CONFLICT", message),
  notImplemented: (message = "未実装です") => new ApiError(501, "NOT_IMPLEMENTED", message),
  internal: (message = "内部エラーが発生しました") => new ApiError(500, "INTERNAL_ERROR", message),
};

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? "入力内容が不正です";
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message } }, { status: 400 });
  }
  console.error(error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "内部エラーが発生しました" } },
    { status: 500 },
  );
}

/** Wraps a route handler so any thrown ApiError (or unknown error) is converted to the spec's error shape. */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>,
): (...args: T) => Promise<NextResponse> {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
