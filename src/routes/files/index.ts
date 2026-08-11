import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { prisma } from "../../lib/prisma";

const router = Router();

router.get("/files", authMiddleware, async (req, res) => {
  const files = await prisma.file.findMany({
    where: {
      ownerId: req.user!.id,
    },
    select: {
      id: true,
      ownerId: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      uploadedAt: true,
    },
    orderBy: {
      uploadedAt: "desc",
    },
  });

  return res.status(200).json({
    files,
  });
});

export default router;
