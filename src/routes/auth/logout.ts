import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { prisma } from "../../lib/prisma";

const router = Router();

router.post("/logout", authMiddleware, async (req, res) => {
  try {
    const sessionId = req.cookies?.session;

    if (sessionId) {
      await prisma.session.deleteMany({
        where: {
          id: sessionId,
        },
      });
    }

    res.clearCookie("session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

export default router;
