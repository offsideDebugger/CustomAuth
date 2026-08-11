import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const sessionId = req.cookies.session;

    if (!sessionId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const session = await prisma.session.findUnique({
      where: {
        id: sessionId,
      },
      include: {
        user: true,
      },
    });

    if (!session) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    if (session.expiresAt <= new Date()) {
      await prisma.session.delete({
        where: {
          id: session.id,
        },
      });

      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
    };

    req.sessionId = session.id;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
