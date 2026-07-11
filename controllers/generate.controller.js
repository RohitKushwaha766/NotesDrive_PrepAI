import Notes from "../models/notes.model.js"
import UserModel from "../models/user.model.js"
import { generateGeminiResponse } from "../services/gemini.services.js"
import { buildPrompt } from "../utils/promptBuilder.js"
import { ensureVisualBlocks } from "../utils/visualBlocks.js"

export const generateNotes = async (req, res) => {
    try {
        const {
            topic,
            classLevel,
            examType,
            revisionMode = false,
            includeDiagram = false,
            includeChart = false,
            generatorMode = "notes",
            questionTypes = ["short", "long", "mcq"],
            questionCount = 5,
            difficulty = "mixed",
            enableBranding = false,
            instituteName = "",
            customWatermark = ""
        } = req.body;
        if (!topic) {
            return res.status(400).json({ message: "Topic is required" })
        }
        const user = await UserModel.findById(req.userId)
        if (!user) {
            return res.status(400).json({ message: "user is not found" })
        }

        if (user.credits < 10) {
            user.isCreditAvailable = false
            await user.save()
            return res.status(403).json({
                message: "Insufficient credits"
            });
        }

        const prompt = buildPrompt({
            topic,
            classLevel,
            examType,
            revisionMode,
            includeDiagram,
            includeChart,
            generatorMode,
            questionTypes,
            questionCount,
            difficulty
        })


        const aiResponse = ensureVisualBlocks(await generateGeminiResponse(prompt), { topic, classLevel, examType, generatorMode })
        aiResponse.mode = generatorMode === "questions" ? "questions" : "notes"
        aiResponse.branding = {
            enabled: Boolean(enableBranding),
            instituteName: enableBranding ? instituteName : "",
            watermark: enableBranding ? customWatermark : ""
        }
   

        const notes = await Notes.create({
            user: user._id,
            topic,
            classLevel,
            examType,
            revisionMode,
            includeDiagram,
            includeChart,
            generatorMode,
            questionTypes,
            questionCount,
            difficulty,
            enableBranding,
            instituteName: enableBranding ? instituteName : "",
            customWatermark: enableBranding ? customWatermark : "",
            content: aiResponse


        })


        user.credits -= 10;
        if (user.credits <= 0) user.isCreditAvailable = false;

        if (!Array.isArray(user.notes)) {
            user.notes = [];
        }

        user.notes.push(notes._id);

        await user.save();

        return res.status(200).json({
            data: aiResponse,
      noteId: notes._id,
      creditsLeft: user.credits
        })




    } catch (error) {
        console.error(error);
    res.status(500).json({
      error: "AI generation failed",
      message: error.message
    });

    }
}


