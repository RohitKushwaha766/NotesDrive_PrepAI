import crypto from "crypto"
import dotenv from "dotenv"
import mongoose from "mongoose"
import AdRewardTransactionModel from "../models/adRewardTransaction.model.js"
import UserModel from "../models/user.model.js"

dotenv.config()

const DEFAULT_CREDIT_PLANS = [
  { amount: 50, credits: 200, title: "Starter", description: "Perfect for quick revisions" },
  { amount: 100, credits: 450, title: "Popular", description: "Best value for students", popular: true },
  { amount: 200, credits: 1000, title: "Pro Learner", description: "For serious exam preparation" }
]

const BRANDING_AMOUNT = 10
const REWARDED_AD_CREDITS = Number(process.env.REWARDED_AD_CREDITS || 5)
const REWARDED_AD_DAILY_LIMIT = Number(process.env.REWARDED_AD_DAILY_LIMIT || 3)
const ADMOB_SSV_KEYS_URL = "https://www.gstatic.com/admob/reward/verifier-keys.json"
const ADMOB_SSV_MAX_AGE_MS = Number(process.env.ADMOB_SSV_MAX_AGE_MS || 24 * 60 * 60 * 1000)
const REQUIRE_ADMOB_SSV = String(process.env.REQUIRE_ADMOB_SSV || "false").toLowerCase() === "true"

let admobKeyCache = {
  fetchedAt: 0,
  keys: new Map()
}

const decodeBase64Url = (value) => {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=")
  return Buffer.from(padded, "base64")
}

const getAdMobPublicKeys = async () => {
  const now = Date.now()
  if (admobKeyCache.keys.size && now - admobKeyCache.fetchedAt < 24 * 60 * 60 * 1000) {
    return admobKeyCache.keys
  }

  const response = await fetch(ADMOB_SSV_KEYS_URL)
  if (!response.ok) {
    throw new Error(`Could not fetch AdMob verification keys: ${response.status}`)
  }

  const data = await response.json()
  const keys = new Map()

  for (const key of data.keys || []) {
    if (key.keyId && key.pem) {
      keys.set(String(key.keyId), key.pem)
    }
  }

  if (!keys.size) {
    throw new Error("AdMob verification keys response was empty")
  }

  admobKeyCache = {
    fetchedAt: now,
    keys
  }

  return keys
}

const verifyAdMobSsvSignature = async (req) => {
  const queryString = req.originalUrl.split("?")[1] || ""
  const signatureParam = "signature="
  const keyIdParam = "key_id="
  const signatureIndex = queryString.indexOf(signatureParam)

  if (signatureIndex < 1) {
    throw new Error("Missing AdMob SSV signature")
  }

  const dataToVerify = queryString.substring(0, signatureIndex - 1)
  const signatureAndKey = queryString.substring(signatureIndex)
  const keyIdIndex = signatureAndKey.indexOf(keyIdParam)

  if (keyIdIndex < 1) {
    throw new Error("Missing AdMob SSV key_id")
  }

  const signature = signatureAndKey.substring(signatureParam.length, keyIdIndex - 1)
  const keyId = signatureAndKey.substring(keyIdIndex + keyIdParam.length)
  const keys = await getAdMobPublicKeys()
  const publicKey = keys.get(String(keyId))

  if (!publicKey) {
    throw new Error(`AdMob SSV key_id not found: ${keyId}`)
  }

  const verifier = crypto.createVerify("sha256")
  verifier.update(Buffer.from(dataToVerify, "utf8"))
  verifier.end()

  const valid = verifier.verify(publicKey, decodeBase64Url(signature))
  if (!valid) {
    throw new Error("Invalid AdMob SSV signature")
  }
}

const normalizeEnvJson = (value) => {
  const trimmed = String(value || "").trim()
  if (!trimmed) return ""

  const withoutAssignment = trimmed.includes("=") && trimmed.split("=")[0]?.includes("CREDIT_PLANS")
    ? trimmed.slice(trimmed.indexOf("=") + 1).trim()
    : trimmed

  if (
    (withoutAssignment.startsWith("'") && withoutAssignment.endsWith("'")) ||
    (withoutAssignment.startsWith('"') && withoutAssignment.endsWith('"'))
  ) {
    return withoutAssignment.slice(1, -1).trim()
  }

  return withoutAssignment
}

const parseJsonMaybeEscaped = (value) => {
  try {
    return JSON.parse(value)
  } catch (firstError) {
    const unescaped = value
      .replace(/\\(["{}\[\],:])/g, "$1")
      .replace(/\\\\/g, "\\")
    if (unescaped !== value) {
      return JSON.parse(unescaped)
    }
    throw firstError
  }
}

const parseCreditPlans = () => {
  const rawPlans = process.env.PREPAI_CREDIT_PLANS || process.env.CREDIT_PLANS
  if (!rawPlans) {
    return { error: "", plans: DEFAULT_CREDIT_PLANS, source: "default" }
  }

  try {
    const parsed = parseJsonMaybeEscaped(normalizeEnvJson(rawPlans))
    if (!Array.isArray(parsed)) {
      return { error: "Env value is not a JSON array.", plans: DEFAULT_CREDIT_PLANS, source: "default" }
    }

    const plans = parsed
      .map((plan) => ({
        amount: Number(plan.amount),
        credits: Number(plan.credits),
        title: String(plan.title || `${plan.credits || ""} Credits`).trim(),
        description: String(plan.description || "Notes Drive AI credit pack").trim(),
        popular: Boolean(plan.popular)
      }))
      .filter((plan) => plan.amount > 0 && plan.credits > 0)

    return plans.length
      ? { error: "", plans, source: "env" }
      : { error: "No valid plans found in env JSON.", plans: DEFAULT_CREDIT_PLANS, source: "default" }
  } catch (error) {
    console.warn("Invalid PREPAI_CREDIT_PLANS/CREDIT_PLANS JSON. Using default credit plans.", error?.message)
    return { error: error?.message || "Invalid JSON", plans: DEFAULT_CREDIT_PLANS, source: "default" }
  }
}

const creditPlans = () => parseCreditPlans().plans
const creditsForAmount = (amount) => creditPlans().find((plan) => plan.amount === amount)?.credits

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

export const getCreditPlans = async (_req, res) => {
  const parsed = parseCreditPlans()
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  return res.status(200).json({ plans: parsed.plans, source: parsed.source })
}

export const debugCreditPlans = async (_req, res) => {
  const parsed = parseCreditPlans()
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  return res.status(200).json({
    env: {
      creditPlansLength: process.env.CREDIT_PLANS ? process.env.CREDIT_PLANS.length : 0,
      hasCreditPlans: Boolean(process.env.CREDIT_PLANS),
      hasPrepAICreditPlans: Boolean(process.env.PREPAI_CREDIT_PLANS),
      prepAICreditPlansLength: process.env.PREPAI_CREDIT_PLANS ? process.env.PREPAI_CREDIT_PLANS.length : 0
    },
    error: parsed.error,
    planCount: parsed.plans.length,
    source: parsed.source
  })
}

export const createCreditsOrder = async (req, res) => {
  try {
    const userId = req.userId
    const amount = Number(req.body.amount)
    const credits = creditsForAmount(amount)

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
    const credits = creditsForAmount(amount)
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

export const claimRewardedAdCredits = async (req, res) => {
  try {
    if (REQUIRE_ADMOB_SSV) {
      return res.status(202).json({
        message: "Reward will be added after AdMob server verification.",
        credits: undefined,
        rewardedCredits: 0,
        rewardsUsedToday: 0,
        rewardsLimit: REWARDED_AD_DAILY_LIMIT,
        pendingVerification: true
      })
    }

    const userId = req.userId
    const today = new Date().toISOString().slice(0, 10)
    const user = await UserModel.findById(userId)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const rewardMeta = user.rewardedAdCredits || {}
    const usedToday = rewardMeta.date === today ? Number(rewardMeta.count || 0) : 0

    if (usedToday >= REWARDED_AD_DAILY_LIMIT) {
      return res.status(429).json({
        message: "Daily rewarded ad limit reached. Please try again tomorrow.",
        credits: user.credits,
        rewardedCredits: 0,
        rewardsUsedToday: usedToday,
        rewardsLimit: REWARDED_AD_DAILY_LIMIT
      })
    }

    user.credits = Number(user.credits || 0) + REWARDED_AD_CREDITS
    user.isCreditAvailable = true
    user.rewardedAdCredits = {
      date: today,
      count: usedToday + 1
    }
    await user.save()

    return res.status(200).json({
      message: `${REWARDED_AD_CREDITS} credits added successfully.`,
      credits: user.credits,
      rewardedCredits: REWARDED_AD_CREDITS,
      rewardsUsedToday: usedToday + 1,
      rewardsLimit: REWARDED_AD_DAILY_LIMIT
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || "Reward credits failed" })
  }
}

export const handleAdMobSsvReward = async (req, res) => {
  try {
    await verifyAdMobSsvSignature(req)

    const {
      ad_network,
      ad_unit,
      custom_data,
      reward_amount,
      reward_item,
      timestamp,
      transaction_id,
      user_id
    } = req.query

    if (!transaction_id || !user_id) {
      return res.status(400).json({ message: "Missing transaction_id or user_id" })
    }

    if (!mongoose.Types.ObjectId.isValid(String(user_id))) {
      return res.status(400).json({ message: "Invalid user_id" })
    }

    const rewardTime = Number(timestamp || 0)
    if (rewardTime && Math.abs(Date.now() - rewardTime) > ADMOB_SSV_MAX_AGE_MS) {
      return res.status(400).json({ message: "AdMob SSV callback is too old" })
    }

    const user = await UserModel.findById(String(user_id))
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const today = new Date().toISOString().slice(0, 10)
    const rewardMeta = user.rewardedAdCredits || {}
    const usedToday = rewardMeta.date === today ? Number(rewardMeta.count || 0) : 0

    if (usedToday >= REWARDED_AD_DAILY_LIMIT) {
      return res.status(200).json({
        message: "Daily reward limit already reached",
        credited: false
      })
    }

    const existing = await AdRewardTransactionModel.findOne({ transactionId: String(transaction_id) })
    if (existing) {
      return res.status(200).json({
        message: "Reward transaction already processed",
        credited: false
      })
    }

    await AdRewardTransactionModel.create({
      adNetwork: String(ad_network || ""),
      adUnit: String(ad_unit || ""),
      customData: String(custom_data || ""),
      rewardAmount: Number(reward_amount || REWARDED_AD_CREDITS),
      rewardItem: String(reward_item || ""),
      timestamp: String(timestamp || ""),
      transactionId: String(transaction_id),
      userId: user._id
    })

    user.credits = Number(user.credits || 0) + REWARDED_AD_CREDITS
    user.isCreditAvailable = true
    user.rewardedAdCredits = {
      date: today,
      count: usedToday + 1
    }
    await user.save()

    return res.status(200).json({
      message: `${REWARDED_AD_CREDITS} credits added successfully.`,
      credited: true
    })
  } catch (error) {
    return res.status(400).json({
      message: error.message || "AdMob SSV verification failed",
      credited: false
    })
  }
}
