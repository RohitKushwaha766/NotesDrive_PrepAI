import express from "express"
import { googleAuth, logOut, mobileAuth } from "../controllers/auth.controller.js"

const authRouter = express.Router()

authRouter.post("/google" , googleAuth)
authRouter.post("/mobile" , mobileAuth)
authRouter.get("/logout" , logOut)
export default authRouter
