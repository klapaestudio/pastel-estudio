import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "../lib/enums";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export interface AuthPayload {
  userId: string;
  role: Role;
  contactoId?: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autenticado" });
  }
  try {
    const token = header.slice("Bearer ".length);
    req.auth = jwt.verify(token, JWT_SECRET) as AuthPayload;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ error: "No autenticado" });
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: "No tenés permiso para esta acción" });
    }
    next();
  };
}
