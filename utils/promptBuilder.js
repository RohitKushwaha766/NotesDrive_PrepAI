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
- Add structured Mermaid/SVG-style diagrams only when the concept genuinely needs a visual.
- For geometry, mensuration, trigonometry, maps, geography, biology structures, physics circuits, apparatus, or flow processes, diagrams are REQUIRED.
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
- Cover the topic deeply: definitions, concepts, laws/rules, formulas, reactions, examples, exceptions, applications, mistakes, and exam tips as relevant.
- Keep content dense but readable; do not make it too short unless Revision Mode is ON.
- Never return an empty page.
- Every page must contain a non-empty "blocks" array.
- Every block must contain useful text in "text", "items", "steps", or "rows".
- Use formulas, reactions, definitions, examples, differences, properties, uses, precautions, tricks, and memory points as relevant.
- For school topics, prefer NCERT/CBSE-style explanation.
- For competition topics, include exam keywords and quick facts.
- For college topics, use stronger conceptual depth but keep the short-notes layout.
- If a process, apparatus, cycle, structure, pathway, circuit, timeline, comparison, or hierarchy is important, include a "diagram" block with labels in "items" plus "nodes" and "edges".
- If the topic is triangles, circles, coordinate geometry, surface areas, volumes, maps or directions, include at least one "diagram" block.
- For geometry diagrams, set "shape" when useful: "triangle", "circle", "solid", or "map".
- For diagrams, prefer structured SVG/Mermaid-style data instead of explaining a diagram in bullet points.
- Use "diagramType" to help the app render the visual: "flowchart", "cycle", "hierarchy", "comparison", "timeline", "process", "circuit", "geometry", "apparatus", "structure", or "map".
- Use "nodes" as short labels and "edges" as relationships. Example: nodes ["Battery", "Switch", "Bulb"], edges [["Battery","Switch"],["Switch","Bulb"],["Bulb","Battery"]].
- Do not write a diagram block where the "items" only say "Diagram", "Label 1", "Label 2", etc. The diagram must have meaningful nodes/edges.
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
- "diagram": structured SVG/Mermaid-style concept/process diagram; use "items" for labels, "nodes" for visual nodes, "edges" for links, "diagramType" for visual style, and "text" for a short caption
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
