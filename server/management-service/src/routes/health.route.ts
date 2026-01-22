import { Router } from "express";
import { logger } from "../logger/logger";

const router = Router();

router.get("/", (_req, res) => {
  logger.info("Health check called");
  res.json({
    service: "management-service",
    status: "UP"
  });
});

export default router;
