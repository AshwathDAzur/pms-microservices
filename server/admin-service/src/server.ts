import dotenv from 'dotenv';
import app  from "./app";
import { logger } from "./logger/logger";

dotenv.config();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`admin-service running on port ${PORT}`);
});