import dotenv from "dotenv";
dotenv.config();
import connectMongoDB from "./config/db.js";
import app from "./app.js";
import { checkEscalations } from "./utils/escalation.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectMongoDB();
  setInterval(() => {
    checkEscalations();
  }, 60 * 60 * 1000);
});
