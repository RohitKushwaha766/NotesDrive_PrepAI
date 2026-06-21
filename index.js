import express from "express"
import dotenv from "dotenv"
import connectDb from "./utils/connectDb.js"
import authRouter from "./routes/auth.route.js"
import cookieParser from "cookie-parser"
import cors from "cors"
import userRouter from "./routes/user.route.js"
import notesRouter from "./routes/genrate.route.js"
import pdfRouter from "./routes/pdf.route.js"
import creditRouter from "./routes/credits.route.js"

dotenv.config()

const app = express()

const defaultAllowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://notesdrive.com",
    "https://www.notesdrive.com",
    "https://prepai.notesdrive.com",
    "https://ai.notesdrive.com"
]

const envAllowedOrigins = [
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN
]
    .filter(Boolean)
    .flatMap((origin) => origin.split(","))
    .map((origin) => origin.trim())
    .filter(Boolean)

const allowedOrigins = new Set([...defaultAllowedOrigins, ...envAllowedOrigins])

const legalLinks = {
    contact: "https://notesdrive.com/contact-us/",
    privacy: "https://notesdrive.com/privacy-policy/",
    refund: "https://notesdrive.com/refund_returns/",
    terms: "https://notesdrive.com/terms-and-conditions/"
}

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
            return callback(null, true)
        }
        return callback(new Error(`Origin ${origin} is not allowed by CORS`))
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}))

app.use(express.json())
app.use(cookieParser())

const PORT = process.env.PORT || 5000

app.get("/", (req, res) => {
    res.json({
        message: "Notes Drive AI API is running",
        legal: legalLinks
    })
})

app.use("/api/auth", authRouter)
app.use("/api/user", userRouter)
app.use("/api/notes", notesRouter)
app.use("/api/pdf", pdfRouter)
app.use("/api/credit", creditRouter)

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    connectDb()
})
