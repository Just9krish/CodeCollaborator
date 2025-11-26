import type { Request, Response, NextFunction } from "express";

/**
 * Custom application error class with status code support
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common error factory functions
 */
export const errors = {
  unauthorized: (message = "Unauthorized") => new AppError(401, message),
  forbidden: (message = "Forbidden") => new AppError(403, message),
  notFound: (resource = "Resource") =>
    new AppError(404, `${resource} not found`),
  badRequest: (message = "Bad request") => new AppError(400, message),
  conflict: (message = "Conflict") => new AppError(409, message),
  internal: (message = "Internal server error") =>
    new AppError(500, message, false),
};

/**
 * Async handler wrapper that catches errors and passes them to the error handler
 * Use this to wrap async route handlers to avoid try/catch blocks
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handler middleware
 * Should be registered as the last middleware in the chain
 */
export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Log the error
  console.error("Error:", err);

  // Handle known operational errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  }

  // Handle Zod validation errors
  if (err.name === "ZodError") {
    return res.status(400).json({
      message: "Validation error",
      errors: (err as any).flatten?.() || err.message,
    });
  }

  // Handle unknown errors
  const statusCode = 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;

  return res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

/**
 * Not found handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    message: `Route ${req.method} ${req.path} not found`,
  });
}
