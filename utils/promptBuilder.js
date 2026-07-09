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
- Use visual blocks wherever they genuinely help understanding.
- For Mathematics, use SVG-shape friendly diagram blocks: coordinate axes, number line, geometry figures, circle, triangle, Venn diagram, graph, matrix grid, bar chart, or formula layout.
- For Physics/Chemistry/Biology, use simple SVG-shape friendly diagrams only when they are visually meaningful: circuit, ray, apparatus, cycle, structure, flow, or labeled process.
- For History, Geography, Civics, Political Science, Economics, and map/current-affairs style topics, prefer real-image reference blocks instead of abstract node diagrams. Use "visualStyle": "real-image" and add a very specific "imageQuery" such as "NCERT Class 10 nationalism in India map" or "Indian Parliament building educational image".
- Avoid generic box-and-line diagrams because students may not understand them.
- Do not write fake labels like "Label 1" or "Diagram". A diagram must teach something directly.
- Real image blocks are allowed through "imageUrl" when available, otherwise provide "imageQuery" and "caption" for the renderer/search service.
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
- If a process, apparatus, cycle, structure, pathway, circuit, timeline, comparison, hierarchy, map, graph, or geometry concept is important, use a useful "diagram" block.
- For geometry diagrams, set "shape" when useful: "triangle", "circle", "solid", "map", "axis", "graph", "numberLine", "venn", "matrix", "bar", or "timeline".
- For mathematics formulas with powers, use ^ notation in JSON text (example: "I^2 x R x t"). The app will render the power visually.
- For social-science topics, set "visualStyle": "real-image" and "diagramType": "historical-image | map | geography-photo | civics-photo | timeline". Add "imageQuery" and a short caption.
- Use "nodes" and "edges" only when a relationship diagram is actually clear.
- Do not create abstract node-and-edge diagrams for human heart, blood circulation, bridge circuits, cells, organs, or apparatus unless the labels and layout are clearly meaningful.
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
- "diagram": useful visual block; use "shape", "diagramType", "visualStyle", "items", "nodes", "edges", "imageUrl", "imageQuery", and "caption" as needed
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
            "shape": "triangle | circle | solid | map | concept | axis | graph | numberLine | venn | matrix | bar | timeline",
            "diagramType": "flowchart | cycle | hierarchy | comparison | timeline | process | circuit | geometry | graph | numberLine | venn | matrix | apparatus | structure | map | historical-image | geography-photo | civics-photo",
            "visualStyle": "svg-shapes | real-image",
            "imageUrl": "string",
            "imageQuery": "string",
            "caption": "string",
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


