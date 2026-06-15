import UserModel from "../models/user.model.js"
import { getToken } from "../utils/token.js"

const getCookieOptions = (req) => {
    const isSecureRequest =
        req.secure ||
        req.get("x-forwarded-proto") === "https" ||
        process.env.NODE_ENV === "production"

    return {
        httpOnly: true,
        secure: isSecureRequest,
        sameSite: isSecureRequest ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
}

export const googleAuth = async (req,res) => {
    try {
        
        const {name , email} = req.body
        let user = await UserModel.findOne({email})
        if(!user){
            user = await UserModel.create({
                name , email
            })
        }
        let token = await getToken(user._id)
        res.cookie("token" , token , getCookieOptions(req))
        return res.status(200).json(user)
    } catch (error) {
        return res.status(500).json({message:`googleSignup Error  ${error}`})
    }
    
}

export const mobileAuth = async (req,res) => {
    try {
        const {name, email} = req.body

        if (!email) {
            return res.status(400).json({message:"Email is required"})
        }

        let user = await UserModel.findOne({email})
        if(!user){
            user = await UserModel.create({
                name: name || email.split("@")[0],
                email
            })
        }

        let token = await getToken(user._id)
        res.cookie("token" , token , getCookieOptions(req))
        return res.status(200).json({user, token})
    } catch (error) {
        return res.status(500).json({message:`mobile auth error ${error}`})
    }
}

export const logOut = async (req,res) => {
    try {
        res.clearCookie("token", getCookieOptions(req))
         return res.status(200).json({message:"LogOut Successfully"})
    } catch (error) {
        return res.status(500).json({message:`Logout Error  ${error}`})
    }
}
