export const buildPrompt = ({
  topic,
  classLevel,
  examType,
  revisionMode,
  generatorMode = "notes",
  questionTypes = ["short", "long", "mcq"],
  questionCount = 5,
  difficulty = "mixed"
}) => {
  const mode = generatorMode === "questions" ? "questions" : "notes"

  return `
You are a strict JSON generator for an exam preparation app.

VERY IMPORTANT:
- Return only valid JSON.
- Use only double quotes in JSON.
- Do not add markdown fences, comments, trailing commas, or text outside JSON.
- Do not use emojis.
- Escape line breaks inside string values using \\n.

INPUT:
Topic: ${topic}
Class / Level: ${classLevel || "Not specified"}
Exam Type: ${examType || "General"}
Mode: ${mode}
Revision Mode: ${revisionMode ? "ON" : "OFF"}
Question Types Needed: ${questionTypes.join(", ")}
Question Count Per Type: ${questionCount}
Difficulty: ${difficulty}

STYLE GOAL:
Create content like colorful handwritten short notes pages:
- White page feel
- Big chapter/topic heading
- Pastel highlighter headings
- Short direct paragraphs in very easy student-friendly language
- Bullet points
- Formula/equation strips when relevant
- Small labeled flow/table/comparison blocks when useful
- Avoid generic box-and-line diagrams because students may not understand them.
- Use diagram blocks only for very simple geometry shapes or very clear process/cycle visuals.
- For biology structures, physics circuits, apparatus, and complex systems, prefer tables, flows, formulas, and labelled key points unless a real template diagram is available.
- No real images
- No chart sections
- No separate "important questions" inside notes mode
- No generic intro/summary filler

NOTES MODE RULES:
- Create ONLY notes, not Q&A.
- Notes must be detailed, exam-useful, and still look like class/college/competition preparation handwritten notes.
- Use very easy language that an average student can understand quickly.
- Explain difficult terms in simple words before using them deeply.
- Prefer short sentences. Avoid unnecessarily advanced vocabulary.
- If English is used, keep it simple school-level English.
- If Hindi context is requested, use simple Hindi/Hinglish-style explanation without making it too formal.
- Keep paragraphs compact. Do not make every sentence oversized or poster-like.
- Prefer more useful points per page instead of very large text with empty space.
- Avoid writing full sections in uppercase. Use title case for headings and normal case for explanations.
- Cover the topic deeply: definitions, concepts, laws/rules, formulas, reactions, examples, exceptions, applications, mistakes, and exam tips as relevant.
- Keep content dense but readable; do not make it too short unless Revision Mode is ON.
- Never return an empty page.
- Every page must contain a non-empty "blocks" array.
- Every block must contain useful text in "text", "items", "steps", or "rows".
- Use formulas, reactions, definitions, examples, differences, properties, uses, precautions, tricks, and memory points as relevant.
- For formulas, use clean notation and then explain symbols in a short separate line.
- For school topics, prefer NCERT/CBSE-style explanation.
- For competition topics, include exam keywords and quick facts.
- For college topics, use stronger conceptual depth but keep the short-notes layout.
- If a process, apparatus, cycle, structure, pathway, circuit, timeline, comparison, or hierarchy is important, use a "flow" block or "table" block first.
- Use a "diagram" block only when the visual can be drawn clearly with simple shapes, such as triangle, circle, cycle, or map.
- If the topic is triangles, circles, coordinate geometry, surface areas, volumes, maps or directions, include at least one simple "diagram" block.
- For geometry diagrams, set "shape" when useful: "triangle", "circle", "solid", or "map".
- Do not create abstract node-and-edge diagrams for human heart, blood circulation, bridge circuits, cells, organs, or apparatus. Use a table or flow instead.
- Do not write a diagram block where the "items" only say "Diagram", "Label 1", "Label 2", etc. The diagram must be genuinely useful.
- If Revision Mode is ON, make notes moderately shorter and more bullet-focused.
- Use 4 to 8 page objects depending on topic size.
- Each page should have 7 to 12 blocks.

QUESTION MODE RULES:
- Create ONLY question-answer content.
- Generate the requested question types only.
- Questions should help all students: school, college, and competition exams.
- Use difficulty: ${difficulty}.
- MCQs must include 4 options and the correct answer.
- Long answers should be structured with points.
- Short answers should be crisp.

ALLOWED NOTE BLOCK TYPES:
- "heading": highlighted section title
- "paragraph": normal explanation
- "bullets": bullet list
- "formula": equation/reaction/formula strip
- "table": comparison/fact table
- "flow": process/sequence steps
- "diagram": simple clear geometry/map/cycle diagram only; use "items" for labels, "shape" for supported shape, and "text" for a short caption
- "note": warning, remember, or exam tip
- "example": examples list

ALLOWED COLORS:
- "yellow"
- "green"
- "blue"
- "pink"
- "purple"

STRICT JSON FORMAT:
{
  "mode": "${mode}",
  "title": "string",
  "classLevel": "${classLevel || ""}",
  "examType": "${examType || "General"}",
  "notes": {
    "chapterTitle": "string",
    "pages": [
      {
        "pageTitle": "string",
        "blocks": [
          {
            "type": "heading | paragraph | bullets | formula | table | flow | diagram | note | example",
            "color": "yellow | green | blue | pink | purple",
            "title": "string",
            "text": "string",
            "items": ["string"],
            "columns": ["string"],
            "rows": [["string"]],
            "steps": ["string"],
            "shape": "triangle | circle | solid | map | concept",
            "diagramType": "flowchart | cycle | hierarchy | comparison | timeline | process | circuit | geometry | apparatus | structure | map",
            "nodes": ["string"],
            "edges": [["string", "string"]]
          }
        ]
      }
    ]
  },
  "qa": {
    "short": [
      { "question": "string", "answer": "string" }
    ],
    "long": [
      { "question": "string", "answer": ["string"] }
    ],
    "mcq": [
      {
        "question": "string",
        "options": ["string", "string", "string", "string"],
        "answer": "string",
        "explanation": "string"
      }
    ],
    "trueFalse": [
      { "question": "string", "answer": "True | False", "explanation": "string" }
    ],
    "fillBlank": [
      { "question": "string", "answer": "string" }
    ]
  }
}

If mode is "notes", keep qa arrays empty.
If mode is "questions", keep notes.pages empty.
RETURN ONLY VALID JSON.
`
}

export const buildExamPrompt = ({ topic, classLevel, examType, questionTypes = [], questionQuantities = {}, difficulty = "mixed" }) => {
  const counts = questionTypes
    .map((type) => `${type}: ${Math.max(0, Math.min(Number(questionQuantities[type]) || 0, 30))}`)
    .filter((item) => !item.endsWith(": 0"))
    .join(", ");

  return `
You are a strict JSON generator for an online exam app.
Return ONLY valid JSON. No markdown, no commentary, no trailing commas.

Create a timed exam on: ${topic}
Class / level: ${classLevel || "Not specified"}
Exam type: ${examType || "General"}
Difficulty: ${difficulty}
Required question counts: ${counts}

Use the class level and exam type to decide an appropriate, realistic marking scheme and total duration. The paper must be fair for that level. Generate exactly each requested quantity and no unrequested types.
MCQ: exactly 4 options. True/false: answer must be True or False. Fill blank questions should use ____.
Every question must include a positive integer "marks" and "suggestedMinutes". Long answers need point-wise model answers. Keep answers hidden from the student; they are for evaluation only.

JSON schema:
{
  "mode": "exam",
  "title": "string",
  "classLevel": "string",
  "examType": "string",
  "exam": {
    "durationMinutes": 60,
    "totalMarks": 100,
    "markingScheme": "Short explanation of marks, negative marking only if appropriate"
  },
  "qa": {
    "short": [{"question":"string","answer":"string","marks":2,"suggestedMinutes":3}],
    "long": [{"question":"string","answer":["point 1"],"marks":5,"suggestedMinutes":8}],
    "mcq": [{"question":"string","options":["A","B","C","D"],"answer":"string","explanation":"string","marks":1,"suggestedMinutes":1}],
    "trueFalse": [{"question":"string","answer":"True","explanation":"string","marks":1,"suggestedMinutes":1}],
    "fillBlank": [{"question":"string with ____","answer":"string","marks":1,"suggestedMinutes":1}]
  }
}
Include empty arrays for types not requested. Ensure exam.totalMarks equals the sum of all question marks. Return only JSON.
`;
};

export const buildExamEvaluationPrompt = ({ exam, answers }) => `
You are a strict but fair exam evaluator. Return ONLY valid JSON.
Evaluate the student's submitted answers against this exam paper. Use the class level and exam type context, award partial marks for short and long answers, and score objective answers accurately. Do not award more than each question's marks.

EXAM PAPER:
${JSON.stringify(exam)}

STUDENT ANSWERS (keyed by question id):
${JSON.stringify(answers)}

Return exactly this JSON shape:
{
  "score": 0,
  "totalMarks": 0,
  "percentage": 0,
  "summary": "short encouraging feedback",
  "questions": [{"id":"string","marksAwarded":0,"maxMarks":0,"correct":true,"feedback":"short feedback","correctAnswer":"string"}]
}
The questions array must include every question in the exam. Return only JSON.
`;
