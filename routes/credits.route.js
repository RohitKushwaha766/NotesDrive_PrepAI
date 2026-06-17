import express from "express"
import isAuth from "../middleware/isAuth.js"
import {
  createBrandingOrder,
  createCreditsOrder,
  debugCreditPlans,
  getCreditPlans,
  verifyBrandingPayment,
  verifyCreditsPayment
} from "../controllers/credits.controller.js"




const creditRouter = express.Router()
creditRouter.get("/plans" , getCreditPlans )
creditRouter.get("/plans/debug" , debugCreditPlans )
creditRouter.post("/order" , isAuth ,createCreditsOrder )
creditRouter.post("/verify" , isAuth ,verifyCreditsPayment )
creditRouter.post("/branding/order" , isAuth ,createBrandingOrder )
creditRouter.post("/branding/verify" , isAuth ,verifyBrandingPayment )

export default creditRouter
