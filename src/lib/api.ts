import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ApiError = {
  error: { code: string; message: string; fields?: Record<string, string[]> };
};

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(code: string, message: string, status: number, fields?: Record<string, string[]>) {
  return NextResponse.json({ error: { code, message, fields } } satisfies ApiError, { status });
}

export function fromZodError(err: ZodError) {
  return fail("VALIDATION_ERROR", "Invalid input", 400, err.flatten().fieldErrors as Record<string, string[]>);
}

export function handleRouteError(err: unknown) {
  if (err instanceof ZodError) return fromZodError(err);
  if (err instanceof Error) return fail("INTERNAL_ERROR", err.message, 500);
  return fail("INTERNAL_ERROR", "Unexpected error", 500);
}
