import express from "express"
import isAuth from "../middleware/isAuth.js"
import {
  createBrandingOrder,
  createCreditsOrder,
  verifyBrandingPayment,
  verifyCreditsPayment
} from "../controllers/credits.controller.js"




const creditRouter = express.Router()
creditRouter.post("/order" , isAuth ,createCreditsOrder )
creditRouter.post("/verify" , isAuth ,verifyCreditsPayment )
creditRouter.post("/branding/order" , isAuth ,createBrandingOrder )
creditRouter.post("/branding/verify" , isAuth ,verifyBrandingPayment )

export default creditRouter
