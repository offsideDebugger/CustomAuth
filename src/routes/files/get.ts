import type { Request } from "express";
import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { prisma } from "../../lib/prisma";

const router = Router();

router.get(
  "/files/:id",
  authMiddleware,
  async (req: Request<{ id: string }>, res) => {
    const file = await prisma.file.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!file) {
      return res.status(404).json({
        error: "File not found",
      });
    }

    if (file.ownerId !== req.user!.id) {
      return res.status(403).json({
        error: "You do not have access to this file",
      });
    }

    return res.status(200).json({
      file,
    });
  },
);

export default router;
