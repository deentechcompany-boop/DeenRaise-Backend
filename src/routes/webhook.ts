import express from "express";
import crypto from "crypto";

const router = express.Router();

router.post(
  "/paystack",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const secret =
        process.env.PAYSTACK_SECRET_KEY;

      if (!secret) {
        return res
          .status(500)
          .send("PAYSTACK_SECRET_KEY Missing");
      }

      const hash = crypto
        .createHmac("sha512", secret)
        .update(req.body)
        .digest("hex");

      if (
        hash !==
        req.headers["x-paystack-signature"]
      ) {
        return res
          .status(401)
          .send("Unauthorized");
      }

      const event = JSON.parse(
        req.body.toString()
      );

      if (
        event.event === "charge.success"
      ) {
        const reference =
          event.data.reference;

        const amount =
          event.data.amount;

        const email =
          event.data.customer.email;

        let tier = "FREE";

        if (amount === 55000)
          tier = "VERIFIED_ORGANIZER";

        if (amount === 105000)
          tier = "PREMIUM_GROWTH";

        console.log(
          "Payment Successful"
        );

        console.log(reference);

        console.log(email);

        console.log(tier);
      }

      res.status(200).send("OK");
    } catch (err) {
      console.log(err);
      res.status(500).send("Error");
    }
  }
);

export default router;
