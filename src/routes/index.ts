import { Router } from "express";

import registerRouter from "./auth/register";
import loginRouter from "./auth/login";
import logoutRouter from "./auth/logout";

import meRouter from "./user/me";

import filesRouter from "./files/index";
import getFileRouter from "./files/get";
import downloadRouter from "./files/download";

const router = Router();

// Authentication
router.use(registerRouter);
router.use(loginRouter);
router.use(logoutRouter);

// User
router.use(meRouter);

// Files
router.use(filesRouter);
router.use(getFileRouter);
router.use(downloadRouter);

export default router;
