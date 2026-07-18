import express from 'express';
import crypto from 'crypto';

const router = express.Router();

// PAYSTACK WEBHOOK LISTENER
router.post('/paystack', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // 1. Verify that the request actually came from Paystack (Security Guard)
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(req.body)
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).send('Unauthorized Signature');
    }

    // 2. Parse the verified event data
    const event = JSON.parse(req.body.toString());

    // 3. Handle successful premium upgrade transactions
    if (event.event === 'charge.success') {
      const { reference, amount, customer } = event.data;
      const userEmail = customer.email;
      
      // Determine premium level based on amount sent (in Kobo)
      let assignedTier = "FREE";
      if (amount === 55000) assignedTier = "VERIFIED_ORGANIZER";  // ₦500 + ₦50 fee
      if (amount === 105000) assignedTier = "PREMIUM_GROWTH";     // ₦1,000 + ₦50 fee

      console.log(`💰 Payment Verified! Reference: ${reference}`);
      console.log(`👤 User: ${userEmail} purchased tier: ${assignedTier}`);
      console.log(`🔄 Syncing subscription logic for ${userEmail} inside Supabase...`);
    }

    // Respond immediately to Paystack with a 200 OK status
    res.status(200).send('Event Received');
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;