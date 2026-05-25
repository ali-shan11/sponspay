import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
  firebaseUid?: string;
}

// Global async local storage for request context
export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const context: RequestContext = {
      ipAddress: this.extractIpAddress(req),
      userAgent: req.get('User-Agent'),
      firebaseUid: (req as any)?.user?.uid || (req as any)?.user?.user_id,
    };

    // Store context in async local storage for the duration of this request
    requestContextStorage.run(context, () => {
      next();
    });
  }

  private extractIpAddress(req: Request): string {
    // Check various headers for the real IP address
    const forwarded = req.get('X-Forwarded-For');
    if (forwarded) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      return forwarded.split(',')[0].trim();
    }

    const realIp = req.get('X-Real-IP');
    if (realIp) {
      return realIp;
    }

    const cfConnectingIp = req.get('CF-Connecting-IP');
    if (cfConnectingIp) {
      return cfConnectingIp;
    }

    // Fallback to connection remote address
    return (
      req.connection.remoteAddress || req.socket.remoteAddress || 'unknown'
    );
  }
}

// Helper function to get current request context
export function getCurrentRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}
