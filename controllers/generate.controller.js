import Notes from "../models/notes.model.js"
import UserModel from "../models/user.model.js"
import { generateGeminiResponse } from "../services/gemini.services.js"
import { buildExamEvaluationPrompt, buildExamPrompt, buildPrompt } from "../utils/promptBuilder.js"

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
            questionQuantities = {},
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
        const isExamMode = generatorMode === "exam";
        const prompt = isExamMode
            ? buildExamPrompt({ topic, classLevel, examType, questionTypes, questionQuantities, difficulty })
            : buildPrompt({
                topic, classLevel, examType, revisionMode, includeDiagram, includeChart,
                generatorMode, questionTypes, questionCount, difficulty
            });

        const aiResponse = await generateGeminiResponse(prompt)
        aiResponse.mode = isExamMode ? "exam" : (generatorMode === "questions" ? "questions" : "notes")
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
            questionQuantities,
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

export const evaluateExam = async (req, res) => {
    try {
        const { noteId, answers = {} } = req.body;
        if (!noteId || !answers || typeof answers !== "object") {
            return res.status(400).json({ message: "Exam id and answers are required" });
        }
        const examNote = await Notes.findOne({ _id: noteId, user: req.userId });
        if (!examNote || examNote.generatorMode !== "exam") {
            return res.status(404).json({ message: "Exam paper not found" });
        }
        const safeAnswers = Object.fromEntries(Object.entries(answers).map(([id, value]) => [
            String(id).slice(0, 100), String(value ?? "").slice(0, 6000)
        ]));
        const evaluation = await generateGeminiResponse(buildExamEvaluationPrompt({
            exam: examNote.content, answers: safeAnswers
        }));
        return res.status(200).json({ data: evaluation });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "AI exam evaluation failed", error: error.message });
    }
};
