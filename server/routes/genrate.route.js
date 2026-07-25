import express from "express"
import isAuth from "../middleware/isAuth.js"
import { evaluateExam, generateNotes } from "../controllers/generate.controller.js"
import { getMyNotes, getSingleNotes } from "../controllers/notes.controller.js"



const notesRouter = express.Router()


notesRouter.post("/generate-notes",isAuth,generateNotes)
notesRouter.post("/evaluate-exam", isAuth, evaluateExam)
notesRouter.get("/getnotes", isAuth,getMyNotes)
notesRouter.get("/:id" , isAuth , getSingleNotes)

export default notesRouter