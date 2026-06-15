import crypto from "crypto"
import dotenv from "dotenv"
import UserModel from "../models/user.model.js"

dotenv.config()

const CREDIT_MAP = {
  50: 200,
  100: 450,
  200: 1000
}

const BRANDING_AMOUNT = 10

const razorpayAuth = () => {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys missing in .env")
  }
  return {
    keyId,
    authHeader: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`
  }
}

export const createCreditsOrder = async (req, res) => {
  try {
    const userId = req.userId
    const amount = Number(req.body.amount)
    const credits = CREDIT_MAP[amount]

    if (!credits) {
      return res.status(400).json({ message: "Invalid credit plan" })
    }

    const { keyId, authHeader } = razorpayAuth()
    const shortUserId = String(userId || "user").slice(-8)
    const receipt = `cr_${shortUserId}_${Date.now().toString(36)}`.slice(0, 40)

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: amount * 100,
        currency: "INR",
        receipt,
        notes: {
          userId,
          credits
        }
      })
    })

    const order = await response.json()
    if (!response.ok) {
      return res.status(500).json({ message: order?.error?.description || "Razorpay order failed" })
    }

    res.status(200).json({
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      credits
    })
  } catch (error) {
    const message = error?.message === "fetch failed"
      ? "Razorpay API se connect nahi ho pa raha. Backend ko internet access ke saath restart karein."
      : error.message || "Razorpay error"
    res.status(500).json({ message })
  }
}

export const createBrandingOrder = async (req, res) => {
  try {
    const userId = req.userId
    const { keyId, authHeader } = razorpayAuth()
    const shortUserId = String(userId || "user").slice(-8)
    const receipt = `br_${shortUserId}_${Date.now().toString(36)}`.slice(0, 40)

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: BRANDING_AMOUNT * 100,
        currency: "INR",
        receipt,
        notes: {
          userId,
          purpose: "custom_branding"
        }
      })
    })

    const order = await response.json()
    if (!response.ok) {
      return res.status(500).json({ message: order?.error?.description || "Branding order failed" })
    }

    return res.status(200).json({
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    })
  } catch (error) {
    const message = error?.message === "fetch failed"
      ? "Razorpay API se connect nahi ho pa raha. Backend ko internet access ke saath restart karein."
      : error.message || "Branding payment error"
    return res.status(500).json({ message })
  }
}

export const verifyBrandingPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Invalid branding payment payload" })
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex")

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Branding payment verification failed" })
    }

    return res.status(200).json({
      message: "Branding unlocked successfully",
      brandingUnlocked: true
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || "Branding payment verification failed" })
  }
}

export const verifyCreditsPayment = async (req, res) => {
  try {
    const userId = req.userId
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount: rawAmount
    } = req.body

    const amount = Number(rawAmount)
    const credits = CREDIT_MAP[amount]
    if (!credits || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment payload" })
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex")

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed" })
    }

    const user = await UserModel.findByIdAndUpdate(
      userId,
      {
        $inc: { credits },
        $set: { isCreditAvailable: true }
      },
      { new: true }
    )

    return res.status(200).json({
      message: "Credits added successfully",
      credits: user?.credits
    })
  } catch (error) {
    res.status(500).json({ message: error.message || "Payment verification failed" })
  }
}
