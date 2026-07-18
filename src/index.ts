import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRouter from "./routes/auth";
import campaignRouter from "./routes/campaigns";
import paymentRouter from "./routes/payments";
import webhookRouter from "./routes/webhook";

dotenv.config();

const app = express();

app.use(cors());

app.use(
  "/api/webhooks",
  express.raw({ type: "application/json" }),
  webhookRouter
);

app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/campaigns", campaignRouter);
app.use("/api/payments", paymentRouter);

app.get("/", (req, res) => {
  res.send("DeenRaise Backend Running 🚀");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});