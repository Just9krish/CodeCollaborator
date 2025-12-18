import type { Request, Response, NextFunction } from "express";
import { AppError } from "./error-handler";

/**
 * Middleware to require authentication
 * Returns 401 if user is not authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

/**
 * Middleware to optionally authenticate
 * Does not return error if user is not authenticated, but sets req.user if they are
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  // Authentication is already handled by passport session
  // This middleware just continues regardless of auth state
  next();
}

/**
 * Higher-order function that creates a middleware to check resource ownership
 * @param getResourceOwnerId - Function that retrieves the owner ID from the resource
 * @param resourceName - Name of the resource for error messages
 */
export function requireOwnership(
  getResourceOwnerId: (req: Request) => Promise<string | null>,
  resourceName = "resource"
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const ownerId = await getResourceOwnerId(req);

      if (!ownerId) {
        return res.status(404).json({ message: `${resourceName} not found` });
      }

      if (ownerId !== req.user!.id) {
        return res.status(403).json({
          message: `Not authorized to access this ${resourceName}`,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
