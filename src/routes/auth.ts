import { Router } from "express";
import { prisma } from "../db";

const router = Router();

/*
==================================
REGISTER
==================================
*/
router.post("/register", async (req, res) => {
  try {
    const {
      email,
      name,
      password,
      accountNumber,
      bankCode,
    } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        error: "Email and name are required.",
      });
    }

    const existing = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: "Email already exists.",
      });
    }

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password,
        accountNumber,
        bankCode,
      },
    });

    return res.json({
      success: true,
      user,
    });
  } catch (err: any) {
    console.error(err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/*
==================================
LOGIN
==================================
*/
router.post("/login", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email required.",
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
        error: "Account not found.",
      });
    }

    return res.json({
      success: true,
      user,
    });
  } catch (err: any) {
    console.error(err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/*
==================================
GET PROFILE
==================================
*/
router.get("/:email", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
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
        error: "User not found.",
      });
    }

    return res.json({
      success: true,
      data: user,
    });
  } catch (err: any) {
    console.error(err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;