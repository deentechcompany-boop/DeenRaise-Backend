import { Router, Request, Response } from "express";
import { prisma } from "../db";

const router = Router();

/*
==================================
CREATE CAMPAIGN
==================================
*/
router.post("/create", async (req: Request, res: Response) => {
  try {
    const {
      title,
      organizer,
      goal,
      description,
      email,
    } = req.body;

    if (!title || !organizer || !goal || !email) {
      return res.status(400).json({
        success: false,
        error:
          "Title, organizer, goal and email are required.",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found.",
      });
    }

    const existing = await prisma.campaign.findFirst({
      where: {
        title,
        userId: user.id,
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error:
          "A campaign with this title already exists.",
      });
    }

    let subAccountId = "PENDING_SETUP";

    try {
      if (
        process.env.PAYSTACK_SECRET_KEY &&
        user.accountNumber &&
        user.bankCode
      ) {
        const paystackResponse = await fetch(
          "https://api.paystack.co/subaccount",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              business_name: organizer,
              settlement_bank: user.bankCode,
              account_number: user.accountNumber,
              percentage_charge: 1,
            }),
          }
        );

        const data = await paystackResponse.json();

        if (paystackResponse.ok && data.status) {
          subAccountId =
            data.data.subaccount_code;
        }
      }
    } catch (err) {
      console.log(
        "Paystack subaccount creation failed."
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        title,
        organizer,
        description:
          description || "No description",
        targetAmount: Number(goal),
        raisedAmount: 0,
        subAccountId,
        endsAt: new Date(
          Date.now() +
            30 * 24 * 60 * 60 * 1000
        ),
        userId: user.id,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        id: campaign.id,
        title: campaign.title,
        organizer: campaign.organizer,
        goal: campaign.targetAmount,
        raised: campaign.raisedAmount,
        subAccountId: campaign.subAccountId,
      },
    });
  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "Failed to create campaign.",
    });
  }
});

/*
==================================
GET USER CAMPAIGNS
==================================
*/
router.get("/my/:email", async (req, res) => {
  try {
    const user =
      await prisma.user.findUnique({
        where: {
          email: req.params.email,
        },
        include: {
          campaigns: true,
        },
      });

    if (!user) {
      return res.status(404).json({
        success: false,
      });
    }

    return res.json({
      success: true,
      data: user.campaigns.map((c) => ({
        id: c.id,
        title: c.title,
        organizer: c.organizer,
        goal: c.targetAmount,
        raised: c.raisedAmount,
        subAccountId: c.subAccountId,
      })),
    });
  } catch {
    res.status(500).json({
      success: false,
    });
  }
});

/*
==================================
PUBLIC CAMPAIGNS
==================================
*/
router.get("/", async (req, res) => {
  try {
    const campaigns =
      await prisma.campaign.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });

    return res.json({
      success: true,
      data: campaigns,
    });
  } catch {
    res.status(500).json({
      success: false,
    });
  }
});

/*
==================================
DONATE
==================================
*/
router.post("/donate", async (req, res) => {
  try {
    const {
      campaignId,
      donorEmail,
      amount,
    } = req.body;

    const campaign =
      await prisma.campaign.findUnique({
        where: {
          id: campaignId,
        },
      });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    await prisma.donation.create({
      data: {
        donorEmail,
        baseAmount: Number(amount),
        totalPaid: Number(amount) + 50,
        campaignId,
      },
    });

    await prisma.campaign.update({
      where: {
        id: campaignId,
      },
      data: {
        raisedAmount:
          campaign.raisedAmount +
          Number(amount),
      },
    });

    return res.json({
      success: true,
      message:
        "Donation recorded successfully.",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
    });
  }
});

/*
==================================
SHARE PAGE
==================================
*/
router.get(
  "/render-view/:id",
  async (req, res) => {
    try {
      const campaign =
        await prisma.campaign.findUnique({
          where: {
            id: req.params.id,
          },
        });

      if (!campaign) {
        return res
          .status(404)
          .send(
            "<h1>Campaign not found.</h1>"
          );
      }

      const percentage =
        campaign.targetAmount > 0
          ? Math.min(
              100,
              (
                campaign.raisedAmount /
                campaign.targetAmount
              ) *
                100
            )
          : 0;

      res.send(`
<!DOCTYPE html>
<html>
<head>
<title>${campaign.title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{
font-family:Arial;
background:#f5f5f5;
padding:20px;
}
.card{
max-width:500px;
margin:auto;
background:white;
padding:30px;
border-radius:15px;
}
.progress{
background:#ddd;
height:15px;
border-radius:20px;
overflow:hidden;
}
.fill{
background:#059669;
height:100%;
width:${percentage}%;
}
button{
width:100%;
padding:15px;
background:#059669;
color:white;
border:none;
border-radius:10px;
cursor:pointer;
}
</style>
</head>
<body>
<div class="card">
<h1>${campaign.title}</h1>
<p>By ${campaign.organizer}</p>

<div class="progress">
<div class="fill"></div>
</div>

<p>
₦${campaign.raisedAmount.toLocaleString()}
raised of
₦${campaign.targetAmount.toLocaleString()}
</p>

<button>
Donate Now
</button>

</div>
</body>
</html>
`);
    } catch {
      res
        .status(500)
        .send(
          "Internal Server Error"
        );
    }
  }
);

export default router;