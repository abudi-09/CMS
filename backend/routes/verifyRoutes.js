import express from "express";
import {
  verifyEmail,
  resendVerification,
} from "../controllers/verify.controller.js";

const router = express.Router();

router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);

export default router;
