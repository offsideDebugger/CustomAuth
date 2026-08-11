import { Router } from "express";
import crypto from "node:crypto";
import argon2 from "argon2";
import prisma from "../../lib/prisma";
import { loginSchema } from "../../schemas/auth";

import { loginRateLimiter } from "../../middleware/rateLimit";

const router = Router();

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

router.post("/login", loginRateLimiter, async (req, res) => {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(401).json({
      error: "Invalid email or password",
    });
  }

  const { email, password } = result.data;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return res.status(401).json({
      error: "Invalid email or password",
    });
  }

  const passwordValid = await argon2.verify(
    user.passwordHash,
    password,
  );

  if (!passwordValid) {
    return res.status(401).json({
      error: "Invalid email or password",
    });
  }

  const sessionId = crypto.randomBytes(32).toString("hex");

  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      expiresAt,
    },
  });

  res.cookie("session", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
});

export default router;
