import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { prisma } from "../../lib/prisma";

const router = Router();

router.get("/me", authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: {
      id: req.user!.id,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      displayName: true,
      bio: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    return res.status(404).json({
      error: "User not found",
    });
  }

  return res.status(200).json({
    user,
  });
});

export default router;
