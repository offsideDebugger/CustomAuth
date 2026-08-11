import type { Request } from "express";
import { Router } from "express";
import path from "node:path";
import { authMiddleware } from "../../middleware/authMiddleware";
import { prisma } from "../../lib/prisma";

const router = Router();

const storageDir = path.resolve(process.cwd(), "storage");

router.get(
  "/files/:id/download",
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

    const filePath = path.join(storageDir, file.fileName);

    return res.download(filePath, file.fileName, (error) => {
      if (error) {
        console.error("File download error:", error);

        if (!res.headersSent) {
          return res.status(404).json({
            error: "File unavailable",
          });
        }
      }
    });
  },
);

export default router;
