import { Router } from "express";
import argon2 from "argon2";
import prisma from "../../lib/prisma";
import { registerSchema } from "../../schemas/auth";

const router = Router();


router.post("/register", async (req, res) => {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "Invalid request",
    });
  }

  const { email, password } = result.data;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return res.status(409).json({
      error: "Unable to register with these details",
    });
  }

  const passwordHash = await argon2.hash(password);

  const user = await prisma.user.create({
    data: {
      id: `usr_${crypto.randomUUID()}`,
      email,
      passwordHash,
      role: "user",
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return res.status(201).json({
    user,
  });
});

export default router;
