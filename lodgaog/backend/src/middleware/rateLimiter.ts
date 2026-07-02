import { Request, Response, NextFunction } from 'express';

interface FailedAttempt {
  attempts: number;
  blockedUntil: number;
}

// In-memory failed attempts tracker mapped by IP
const failedAttemptsMap = new Map<string, FailedAttempt>();

/**
 * Helper to retrieve failed attempts record for an IP.
 * Auto-clears stale/expired locks.
 */
export function getIPFailedRecord(ip: string): FailedAttempt {
  const record = failedAttemptsMap.get(ip);
  if (!record) {
    return { attempts: 0, blockedUntil: 0 };
  }
  
  if (record.blockedUntil > 0 && Date.now() > record.blockedUntil) {
    failedAttemptsMap.delete(ip);
    return { attempts: 0, blockedUntil: 0 };
  }
  
  return record;
}

/**
 * Registers a new failed authentication attempt for an IP.
 * Enforces a 15-minute block on the 5th consecutive failure.
 */
export function recordIPFailedAttempt(ip: string): FailedAttempt {
  const current = getIPFailedRecord(ip);
  const newAttempts = current.attempts + 1;
  let blockedUntil = 0;

  if (newAttempts >= 5) {
    blockedUntil = Date.now() + 15 * 60 * 1000; // 15-minute lock
    console.warn(`[Security Alert] IP ${ip} has been blocked due to 5 consecutive login failures.`);
  }

  const record = { attempts: newAttempts, blockedUntil };
  failedAttemptsMap.set(ip, record);
  return record;
}

/**
 * Clears failed login tracking upon successful authentication.
 */
export function clearIPAttempts(ip: string): void {
  failedAttemptsMap.delete(ip);
}

/**
 * Express middleware to guard auth endpoints against brute force attacks.
 */
export function loginRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.headers['x-forwarded-for'] as string || 'unknown-ip';
  const record = getIPFailedRecord(ip);

  if (record.blockedUntil > 0 && Date.now() < record.blockedUntil) {
    const remainingSeconds = Math.ceil((record.blockedUntil - Date.now()) / 1000);
    const remainingMinutes = Math.ceil(remainingSeconds / 60);
    res.status(429).json({
      error: `Too many failed attempts from this IP. Temporarily blocked. Try again in ${remainingMinutes} minute(s).`
    });
    return;
  }

  next();
}
