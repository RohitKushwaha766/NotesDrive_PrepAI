function hasDiagram(content) {
  const pages = content?.notes?.pages;
  return Array.isArray(pages) && pages.some((page) => Array.isArray(page?.blocks) && page.blocks.some((block) => block?.type === "diagram"));
}

function subjectText(value = {}) {
  return [value.topic, value.classLevel, value.examType, value?.notes?.chapterTitle, value?.title]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function makeHeartDiagram() {
  return {
    type: "diagram",
    color: "pink",
    title: "Human Heart Schematic",
    text: "Simple labeled diagram showing four chambers and blood flow.",
    shape: "heart",
    diagramType: "structure",
    visualStyle: "svg-shapes",
    items: ["Right Atrium", "Right Ventricle", "Left Atrium", "Left Ventricle", "Lungs", "Body"],
    nodes: ["Right Atrium", "Right Ventricle", "Left Atrium", "Left Ventricle", "Lungs", "Body"],
    edges: [["Body", "Right Atrium"], ["Right Atrium", "Right Ventricle"], ["Right Ventricle", "Lungs"], ["Lungs", "Left Atrium"], ["Left Atrium", "Left Ventricle"], ["Left Ventricle", "Body"]],
    caption: "Deoxygenated blood goes to lungs; oxygenated blood goes to body."
  };
}

function makeMathDiagram(text) {
  if (/matrix|matrices/.test(text)) {
    return { type: "diagram", color: "blue", title: "Matrix Layout", text: "Rows and columns form a matrix.", shape: "matrix", diagramType: "matrix", visualStyle: "svg-shapes", items: ["a11", "a12", "a13", "a21", "a22", "a23", "a31", "a32", "a33"] };
  }
  if (/coordinate|graph|linear|quadratic|parabola|function/.test(text)) {
    return { type: "diagram", color: "blue", title: "Coordinate Graph", text: "Graph shape for visual understanding.", shape: "graph", diagramType: "graph", visualStyle: "svg-shapes", items: ["x-axis", "y-axis", "curve"] };
  }
  if (/circle/.test(text)) {
    return { type: "diagram", color: "pink", title: "Circle Diagram", text: "Radius and diameter view.", shape: "circle", diagramType: "geometry", visualStyle: "svg-shapes", items: ["Centre", "Radius", "Diameter"] };
  }
  if (/triangle|geometry/.test(text)) {
    return { type: "diagram", color: "blue", title: "Geometry Diagram", text: "Simple labeled geometry figure.", shape: "triangle", diagramType: "geometry", visualStyle: "svg-shapes", items: ["A", "B", "C"] };
  }
  return null;
}

function makeSocialImageBlock(text) {
  if (!/(history|geography|civics|political|parliament|map|constitution|democracy|revolution|empire|nationalism)/.test(text)) return null;
  return {
    type: "diagram",
    color: "green",
    title: "Real Image Reference",
    text: "Use this real visual reference while studying the topic.",
    shape: "map",
    diagramType: /map|geography/.test(text) ? "map" : "historical-image",
    visualStyle: "real-image",
    imageQuery: `${text.split(/\s+/).slice(0, 10).join(" ")} NCERT educational image`,
    caption: "Relevant real image/map reference for better understanding."
  };
}

function chooseFallbackDiagram(meta) {
  const text = subjectText(meta);
  if (/heart|blood circulation|life process|transport pump|circulatory/.test(text)) return makeHeartDiagram();
  return makeMathDiagram(text) || makeSocialImageBlock(text);
}

export function ensureVisualBlocks(content, meta = {}) {
  if (!content || content.mode === "questions" || meta.generatorMode === "questions") return content;
  const pages = content?.notes?.pages;
  if (!Array.isArray(pages) || !pages.length || hasDiagram(content)) return content;

  const diagram = chooseFallbackDiagram({ ...meta, ...content });
  if (!diagram) return content;

  const targetPage = pages.find((page) => Array.isArray(page?.blocks) && page.blocks.length) || pages[0];
  targetPage.blocks = Array.isArray(targetPage.blocks) ? targetPage.blocks : [];
  const insertIndex = Math.min(2, targetPage.blocks.length);
  targetPage.blocks.splice(insertIndex, 0, diagram);
  return content;
}
