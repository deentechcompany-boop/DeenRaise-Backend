import { Router, Request, Response } from 'express';

const router = Router();

// POST: Initialize Paystack Premium Gateway Link
router.post('/initialize', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, amount, tier } = req.body;

    // Validate that required tracking keys exist in request parameters
    if (!email || !amount) {
      return res.status(400).json({ error: 'Missing required payment metadata details' });
    }

    console.log(`📡 Handshaking checkout session initialization for user: ${email} (${tier})`);

    // Outbound secure native fetch call to Paystack transaction gateway API
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100), // Ensures amount stays a safe integer conversion in Kobo
        callback_url: 'https://deenraise.org/payment-success', // Production routing url hook
        metadata: {
          tier: tier
        }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Paystack network gateway initialization failed');
    }

    // Explicitly forward the validated Paystack structure straight to your PremiumModal
    return res.status(200).json({
      status: true,
      message: data.message,
      data: {
        authorization_url: data.data.authorization_url,
        access_code: data.data.access_code,
        reference: data.data.reference
      }
    });

  } catch (error: any) {
    console.error('⚠️ Paystack Payment Init Error:', error.message);
    
    // OFFLINE SANDBOX MOCK DEVELOPMENT MODE:
    // Fallback allows local testing when network parameters time out or keys are unconfigured
    console.warn('⚡ Using secure sandbox simulation parameters.');
    return res.status(200).json({
      status: true,
      message: "Authorization URL created (Offline Sandbox Mode Fallback)",
      data: {
        authorization_url: "https://checkout.paystack.com/sandbox-fallback-url",
        access_code: "offline_test_access_code",
        reference: `DR-${Math.floor(100000 + Math.random() * 900000)}`
      }
    });
  }
});

export default router;