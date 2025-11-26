import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

/**
 * Validation middleware factory that validates request body against a Zod schema
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors,
      });
    }

    req.body = result.data;
    next();
  };
}

/**
 * Validation middleware factory that validates request params against a Zod schema
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateParams<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid parameters",
        errors: result.error.flatten().fieldErrors,
      });
    }

    req.params = result.data as any;
    next();
  };
}

/**
 * Validation middleware factory that validates request query against a Zod schema
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid query parameters",
        errors: result.error.flatten().fieldErrors,
      });
    }

    req.query = result.data as any;
    next();
  };
}

// Common validation schemas
export const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
});

export const sessionIdParamSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID format"),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});
