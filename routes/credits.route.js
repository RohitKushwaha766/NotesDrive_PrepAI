import express from "express"
import isAuth from "../middleware/isAuth.js"
import {
  createBrandingOrder,
  createCreditsOrder,
  claimRewardedAdCredits,
  checkFreeDownloadUnlock,
  debugCreditPlans,
  getCreditPlans,
  handleAdMobSsvReward,
  verifyBrandingPayment,
  verifyCreditsPayment
} from "../controllers/credits.controller.js"




const creditRouter = express.Router()
creditRouter.get("/plans" , getCreditPlans )
creditRouter.get("/plans/debug" , debugCreditPlans )
creditRouter.post("/order" , isAuth ,createCreditsOrder )
creditRouter.post("/verify" , isAuth ,verifyCreditsPayment )
creditRouter.post("/reward-ad" , isAuth ,claimRewardedAdCredits )
creditRouter.get("/admob-ssv" , handleAdMobSsvReward )
creditRouter.get("/free-download-unlock" , checkFreeDownloadUnlock )
creditRouter.post("/branding/order" , isAuth ,createBrandingOrder )
creditRouter.post("/branding/verify" , isAuth ,verifyBrandingPayment )

export default creditRouter
