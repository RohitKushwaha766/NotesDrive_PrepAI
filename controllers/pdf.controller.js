import PDFDocument from "pdfkit"

const FONT = {
  regular: "Helvetica",
  bold: "Helvetica-Bold",
  oblique: "Helvetica-Oblique"
}

const COLORS = {
  ink: "#1f2937",
  muted: "#6b7280",
  page: "#fffdf7",
  border: "#111827",
  yellow: "#fef3a7",
  green: "#d8f3d1",
  blue: "#cfeeff",
  pink: "#ffd7e5",
  purple: "#ead7ff",
  peach: "#ffe0cc"
}

const safeArray = (value) => Array.isArray(value) ? value : []
const clean = (value = "") => String(value ?? "")
  .replace(/\*\*(.*?)\*\*/g, "$1")
  .replace(/__(.*?)__/g, "$1")
  .replace(/`([^`]+)`/g, "$1")
  .replace(/!\[[^\]]*]\([^)]*\)/g, "")
  .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
  .replace(/[>#]/g, "")
  .trim()

const unwrapResult = (payload = {}) => {
  let value = payload?.result ?? payload?.data ?? payload
  if (typeof value === "string") {
    try {
      value = JSON.parse(value)
    } catch {
      value = { title: "Exam Notes", notes: value }
    }
  }
  if (value?.data && (value.data.notes || value.data.qa || value.data.title || value.data.mode)) {
    value = value.data
  }
  if (value?.content && (value.content.notes || value.content.qa || value.content.title || value.content.mode)) {
    value = value.content
  }
  return value && typeof value === "object" ? value : { title: "Exam Notes", notes: String(value || "") }
}

const fileNameFrom = (result) => {
  const title = clean(result.notes?.chapterTitle || result.title || result.topic || "Exam Notes")
    .replace(/[<>:"/\\|?*]+/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 80)
    .trim()
  return title || "Exam Notes"
}

const firstText = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && clean(value)) return clean(value)
  }
  return ""
}

const asTextArray = (...values) => {
  for (const value of values) {
    if (Array.isArray(value) && value.length) {
      return value.flatMap((item) => {
        if (typeof item === "string") return clean(item)
        const direct = firstText(item?.text, item?.content, item?.description, item?.title, item?.name)
        return direct ? [direct] : collectTextLeaves(item)
      }).filter(Boolean)
    }
  }
  return []
}

const collectTextLeaves = (value, depth = 0, output = []) => {
  if (depth > 5 || output.length >= 80 || value == null) return output

  if (typeof value === "string") {
    const text = clean(value)
    if (text && text.length > 2 && !output.includes(text)) output.push(text)
    return output
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectTextLeaves(item, depth + 1, output))
    return output
  }

  if (typeof value === "object") {
    Object.entries(value).forEach(([key, child]) => {
      if (["mode", "color", "type", "kind", "_id", "id", "createdAt", "updatedAt"].includes(key)) return
      collectTextLeaves(child, depth + 1, output)
    })
  }

  return output
}

const splitFormulaLines = (text = "") => String(text || "")
  .replace(/\s+(?=[A-Z][A-Za-z\s]{2,24}\s*:)/g, "\n")
  .replace(/\s*;\s*/g, "\n")
  .replace(/\s*\|\s*/g, "\n")
  .replace(/\s+(?=\([^)]+\)\s*=)/g, "\n")
  .split(/\n+/)
  .map((line) => clean(line))
  .filter(Boolean)

const trimFormulaToken = (value = "") => String(value).replace(/^\((.*)\)$/g, "$1").trim()

const formulaSegments = (text = "") => {
  const segments = []
  const pattern = /([A-Za-z0-9πɛεθημΩ∆Δ₀-₉₁₂₃⁰-⁹^().+-]+)\s*\/\s*([A-Za-z0-9πɛεθημΩ∆Δ₀-₉₁₂₃⁰-⁹^().+-]+)/g
  let lastIndex = 0
  let match

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      text.slice(lastIndex, match.index).split(/(\s+)/).forEach((part) => {
        if (part.trim()) segments.push({ type: "text", text: part })
      })
    }
    segments.push({
      type: "fraction",
      top: trimFormulaToken(match[1]),
      bottom: trimFormulaToken(match[2])
    })
    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) {
    text.slice(lastIndex).split(/(\s+)/).forEach((part) => {
      if (part.trim()) segments.push({ type: "text", text: part })
    })
  }

  return segments.length ? segments : [{ type: "text", text }]
}

const normalizeBlock = (block) => {
  if (typeof block === "string") {
    return { type: "paragraph", color: "yellow", text: block }
  }

  const items = asTextArray(block?.items, block?.points, block?.bullets, block?.examples, block?.list, Array.isArray(block?.content) ? block.content : null)
  const steps = asTextArray(block?.steps, block?.flow, block?.process)
  const columns = safeArray(block?.columns || block?.headers).map(clean).filter(Boolean)
  const rows = safeArray(block?.rows).map((row) => safeArray(row).map(clean))
  const text = firstText(block?.text, block?.content, block?.description, block?.definition, block?.summary, block?.caption)
  const title = firstText(block?.title, block?.heading, block?.name, block?.label)
  let type = block?.type || block?.kind

  if (!type) {
    if (columns.length && rows.length) type = "table"
    else if (steps.length) type = "flow"
    else if (items.length) type = "bullets"
    else type = title && !text ? "heading" : "paragraph"
  }

  return {
    type,
    color: block?.color || "yellow",
    title,
    text,
    items,
    steps,
    columns,
    rows
  }
}

const normalizePage = (page, result) => {
  if (typeof page === "string") {
    return { pageTitle: result.title || "Short Notes", blocks: [{ type: "paragraph", color: "yellow", text: page }] }
  }

  let blocks = safeArray(page?.blocks).map(normalizeBlock).filter((block) => block.text || block.title || block.items.length || block.steps.length || block.rows.length)

  if (!blocks.length && Array.isArray(page?.sections)) {
    blocks = page.sections.flatMap((section) => {
      const normalized = normalizeBlock(section)
      const sectionBlocks = [normalized]
      safeArray(section?.blocks).forEach((child) => sectionBlocks.push(normalizeBlock(child)))
      return sectionBlocks
    }).filter((block) => block.text || block.title || block.items.length || block.steps.length || block.rows.length)
  }

  if (!blocks.length) {
    const pageText = firstText(page?.text, page?.content, page?.description, page?.summary)
    const pageItems = asTextArray(page?.points, page?.bullets, page?.items, Array.isArray(page?.content) ? page.content : null)
    if (pageText) blocks.push({ type: "paragraph", color: "yellow", text: pageText })
    if (pageItems.length) blocks.push({ type: "bullets", color: "green", title: "Key Points", items: pageItems })
  }

  if (!blocks.length) {
    const extracted = collectTextLeaves(page)
      .filter((text) => text !== result.title && text !== result.notes?.chapterTitle)
      .slice(0, 16)
    if (extracted.length) {
      blocks.push({ type: "bullets", color: "blue", title: "Key Points", items: extracted })
    }
  }

  return {
    pageTitle: firstText(page?.pageTitle, page?.title, page?.heading) || result.title || "Short Notes",
    blocks
  }
}

const addAutoDiagrams = (pages, result) => {
  if (!Array.isArray(pages) || !pages.length) return pages
  const title = `${result?.notes?.chapterTitle || ""} ${result?.title || ""} ${result?.topic || ""}`.toLowerCase()
  const hasDiagram = pages.some((page) => safeArray(page.blocks).some((block) => block.type === "diagram"))
  if (hasDiagram) return pages

  const diagram = getAutoDiagram(title)
  if (!diagram) return pages

  const nextPages = pages.map((page) => ({ ...page, blocks: [...safeArray(page.blocks)] }))
  const insertAt = nextPages[0].blocks.findIndex((block) => block.type !== "heading")
  nextPages[0].blocks.splice(insertAt >= 0 ? insertAt : 0, 0, diagram)
  return nextPages
}

const getAutoDiagram = (title) => {
  if (/triangle|triangles|trigonometry|त्रिभुज/.test(title)) {
    return {
      type: "diagram",
      color: "blue",
      title: "Triangle Diagram",
      text: "A triangle has 3 sides, 3 vertices and 3 angles.",
      shape: "triangle",
      items: ["Vertex A", "Vertex B", "Vertex C", "Side AB", "Side BC", "Side CA"]
    }
  }

  if (/map|geography|history|location|region|देश|मानचित्र/.test(title)) {
    return {
      type: "diagram",
      color: "green",
      title: "Map View",
      text: "Map-style visual for places, directions, routes and regions.",
      shape: "map",
      items: ["North", "Region", "Route", "Key Place"]
    }
  }

  if (/circle|radius|diameter|वृत्त/.test(title)) {
    return { type: "diagram", color: "pink", title: "Circle Diagram", text: "Radius, diameter and circumference.", shape: "circle", items: ["Centre O", "Radius r", "Diameter d"] }
  }

  if (/surface|volume|cube|cuboid|cylinder|cone|sphere|solid/.test(title)) {
    return { type: "diagram", color: "purple", title: "3D Shape Diagram", text: "Important dimensions used in surface area and volume formulas.", shape: "solid", items: ["Length", "Breadth", "Height", "Radius"] }
  }

  return null
}

const pageWidth = (doc) => doc.page.width - doc.page.margins.left - doc.page.margins.right
const bottom = (doc) => doc.page.height - doc.page.margins.bottom
const pastel = (name = "yellow") => COLORS[name] || COLORS.yellow

const decoratePage = (doc) => {
  doc.save()
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.page)
  doc
    .lineWidth(1.2)
    .strokeColor(COLORS.border)
    .roundedRect(24, 24, doc.page.width - 48, doc.page.height - 48, 5)
    .stroke()

  drawDoodle(doc, 46, 44, COLORS.blue)
  drawDoodle(doc, doc.page.width - 64, 48, COLORS.pink)
  drawDoodle(doc, 52, doc.page.height - 64, COLORS.green)
  drawDoodle(doc, doc.page.width - 74, doc.page.height - 72, COLORS.purple)
  doc.restore()
  doc.fillColor(COLORS.ink)
}

const drawDoodle = (doc, x, y, color) => {
  doc.save()
  doc.strokeColor(COLORS.border).lineWidth(1)
  doc.circle(x, y, 10).stroke()
  doc.moveTo(x - 15, y).lineTo(x + 15, y).stroke()
  doc.moveTo(x, y - 15).lineTo(x, y + 15).stroke()
  doc.circle(x, y, 3).fill(color)
  doc.restore()
}

const ensureSpace = (doc, height = 70) => {
  if (doc.y + height > bottom(doc)) {
    doc.addPage()
    decoratePage(doc)
    doc.y = doc.page.margins.top
  }
}

const highlightText = (doc, text, options = {}) => {
  const label = clean(text)
  if (!label) return
  const x = options.x ?? doc.page.margins.left
  const y = options.y ?? doc.y
  const fontSize = options.size ?? 16
  doc.font(FONT.bold).fontSize(fontSize)
  const width = Math.min(doc.widthOfString(label) + 28, options.width || pageWidth(doc))
  const height = options.height ?? fontSize + 14

  doc.save()
  doc.roundedRect(x, y, width, height, height / 2).fill(pastel(options.color))
  doc.fillColor(COLORS.ink).font(FONT.bold).fontSize(fontSize).text(label, x + 14, y + 8, {
    width: width - 28,
    lineBreak: false
  })
  doc.restore()
  doc.y = y + height + (options.gap ?? 8)
}

const writeText = (doc, text, options = {}) => {
  const value = clean(text)
  if (!value) return
  ensureSpace(doc, options.space ?? 46)
  doc
    .fillColor(options.color || COLORS.ink)
    .font(options.bold ? FONT.bold : FONT.regular)
    .fontSize(options.size || 12)
    .text(value, options.x || doc.page.margins.left, doc.y, {
      width: options.width || pageWidth(doc),
      lineGap: options.lineGap ?? 3,
      align: options.align || "left"
    })
  doc.moveDown(options.moveDown ?? 0.35)
}

const drawHeader = (doc, result) => {
  const title = clean(result.notes?.chapterTitle || result.title || "Short Notes")
  doc.y = 48
  doc.save()
  doc.roundedRect(70, doc.y, doc.page.width - 140, 54, 24).fill(COLORS.pink)
  doc.roundedRect(190, doc.y + 5, doc.page.width - 270, 48, 24).fill(COLORS.green)
  doc.fillColor(COLORS.ink).font(FONT.bold).fontSize(26).text(title, 82, doc.y + 13, {
    width: doc.page.width - 164,
    align: "center",
    lineBreak: false
  })
  doc.restore()
  doc.y = 125
}

const drawSectionHeading = (doc, block) => {
  ensureSpace(doc, 48)
  const x = doc.page.margins.left
  const y = doc.y
  doc.save()
  doc.strokeColor(COLORS.border).lineWidth(1.8)
  doc.moveTo(x - 6, y + 14).lineTo(x + 10, y + 14).lineTo(x + 4, y + 8).moveTo(x + 10, y + 14).lineTo(x + 4, y + 20).stroke()
  doc.restore()
  highlightText(doc, block.title || block.text, {
    x: x + 20,
    y,
    color: block.color || "green",
    size: 16,
    width: pageWidth(doc) - 20
  })
}

const drawFormula = (doc, block) => {
  const lines = splitFormulaLines(block.text)
  const lineHeight = 34
  const titleHeight = block.title ? 18 : 0
  const boxHeight = Math.max(62, titleHeight + lines.length * lineHeight + 24)
  ensureSpace(doc, boxHeight + 24)
  const x = doc.page.margins.left + 22
  const width = pageWidth(doc) - 44
  const y = doc.y
  doc.roundedRect(x, y, width, boxHeight, 10).fill(pastel(block.color || "blue")).stroke(COLORS.border)
  if (block.title) {
    doc.fillColor(COLORS.muted).font(FONT.bold).fontSize(8).text(clean(block.title).toUpperCase(), x + 14, y + 7, {
      width: width - 28
    })
  }
  let lineY = y + (block.title ? 24 : 15)
  lines.forEach((line) => {
    drawFormulaLine(doc, line, x + 18, lineY, width - 36)
    lineY += lineHeight
  })
  doc.y = y + boxHeight + 12
}

const drawFormulaLine = (doc, line, x, y, width) => {
  const segments = formulaSegments(line)
  doc.font(FONT.bold).fontSize(14)

  const segmentWidths = segments.map((segment) => {
    if (segment.type === "fraction") {
      return Math.max(doc.widthOfString(segment.top), doc.widthOfString(segment.bottom), 24) + 10
    }
    return doc.widthOfString(segment.text) + 4
  })

  const totalWidth = segmentWidths.reduce((sum, item) => sum + item, 0)
  let cursor = x + Math.max(0, (width - totalWidth) / 2)

  segments.forEach((segment, index) => {
    const segmentWidth = segmentWidths[index]
    if (segment.type === "fraction") {
      const topWidth = doc.widthOfString(segment.top)
      const bottomWidth = doc.widthOfString(segment.bottom)
      doc.fillColor(COLORS.ink).font(FONT.bold).fontSize(11)
      doc.text(segment.top, cursor + (segmentWidth - topWidth) / 2, y, { lineBreak: false })
      doc.moveTo(cursor + 3, y + 14).lineTo(cursor + segmentWidth - 3, y + 14).stroke(COLORS.ink)
      doc.text(segment.bottom, cursor + (segmentWidth - bottomWidth) / 2, y + 17, { lineBreak: false })
    } else {
      doc.fillColor(COLORS.ink).font(FONT.bold).fontSize(14)
      doc.text(segment.text, cursor, y + 8, { lineBreak: false })
    }
    cursor += segmentWidth
  })
}

const drawBullets = (doc, block) => {
  if (block.title) highlightText(doc, block.title, { color: block.color || "yellow", size: 13, height: 28 })
  safeArray(block.items).forEach((item) => {
    ensureSpace(doc, 34)
    const y = doc.y + 5
    doc.circle(doc.page.margins.left + 8, y + 4, 3).fill(COLORS.ink)
    doc.fillColor(COLORS.ink).font(FONT.bold).fontSize(13).text(clean(item), doc.page.margins.left + 24, doc.y, {
      width: pageWidth(doc) - 24,
      lineGap: 3
    })
    doc.moveDown(0.15)
  })
  doc.moveDown(0.25)
}

const drawParagraph = (doc, block) => {
  if (block.title) {
    const y = doc.y
    highlightText(doc, block.title, { color: block.color || "pink", size: 13, height: 28, gap: 3 })
    doc.y = Math.max(doc.y, y + 30)
  }
  writeText(doc, block.text, { bold: true, size: 13.2, lineGap: 4 })
}

const drawNote = (doc, block) => {
  ensureSpace(doc, 76)
  const x = doc.page.margins.left
  const width = pageWidth(doc)
  const y = doc.y
  const text = `${clean(block.title || "Note")} - ${clean(block.text)}`
  const height = Math.max(52, doc.heightOfString(text, { width: width - 28 }) + 24)
  doc.roundedRect(x, y, width, height, 10).fill(pastel(block.color || "yellow")).stroke(COLORS.border)
  doc.fillColor(COLORS.ink).font(FONT.bold).fontSize(12.5).text(text, x + 14, y + 13, {
    width: width - 28,
    lineGap: 3
  })
  doc.y = y + height + 12
}

const drawTable = (doc, block) => {
  const columns = safeArray(block.columns)
  const rows = safeArray(block.rows)
  if (!columns.length || !rows.length) return
  if (block.title) highlightText(doc, block.title, { color: block.color || "green", size: 13, height: 28 })
  ensureSpace(doc, 120)

  const x = doc.page.margins.left
  const width = pageWidth(doc)
  const colWidth = width / columns.length
  let y = doc.y

  const rowHeight = 28
  doc.font(FONT.bold).fontSize(10.5)
  columns.forEach((column, index) => {
    doc.rect(x + index * colWidth, y, colWidth, rowHeight).fill(COLORS.green).stroke(COLORS.border)
    doc.fillColor(COLORS.ink).text(clean(column), x + index * colWidth + 8, y + 8, { width: colWidth - 16 })
  })
  y += rowHeight

  rows.forEach((row) => {
    ensureSpace(doc, rowHeight + 8)
    row.forEach((cell, index) => {
      doc.rect(x + index * colWidth, y, colWidth, rowHeight).fill("#ffffff").stroke(COLORS.border)
      doc.fillColor(COLORS.ink).font(FONT.regular).fontSize(10).text(clean(cell), x + index * colWidth + 8, y + 7, {
        width: colWidth - 16,
        height: rowHeight - 8
      })
    })
    y += rowHeight
    doc.y = y
  })
  doc.moveDown(0.8)
}

const drawFlow = (doc, block) => {
  if (block.title) highlightText(doc, block.title, { color: block.color || "purple", size: 13, height: 28 })
  safeArray(block.steps).forEach((step, index) => {
    ensureSpace(doc, 54)
    const x = doc.page.margins.left + 70
    const y = doc.y
    const width = pageWidth(doc) - 140
    const colors = ["pink", "yellow", "green", "blue", "purple"]
    doc.roundedRect(x, y, width, 32, 15).fill(pastel(colors[index % colors.length])).stroke(COLORS.border)
    doc.fillColor(COLORS.ink).font(FONT.bold).fontSize(12).text(clean(step), x + 12, y + 9, {
      width: width - 24,
      align: "center",
      lineBreak: false
    })
    doc.y = y + 38
    if (index < safeArray(block.steps).length - 1) {
      doc.fillColor(COLORS.ink).font(FONT.bold).fontSize(14).text("v", { align: "center" })
      doc.moveDown(0.1)
    }
  })
}

const drawDiagram = (doc, block) => {
  const labels = safeArray(block.items).length
    ? safeArray(block.items)
    : safeArray(block.steps).length
      ? safeArray(block.steps)
      : ["Concept", "Process", "Result"]
  ensureSpace(doc, 190)
  if (block.title) highlightText(doc, block.title, { color: block.color || "blue", size: 13, height: 28 })

  const x = doc.page.margins.left + 28
  const y = doc.y
  const width = pageWidth(doc) - 56
  const height = Math.max(130, Math.ceil(labels.length / 3) * 78)

  doc.roundedRect(x, y, width, height, 14).fill("#ffffff").stroke(COLORS.border)
  if (block.text) {
    doc.fillColor(COLORS.muted).font(FONT.bold).fontSize(10).text(clean(block.text), x + 16, y + 12, {
      width: width - 32,
      align: "center"
    })
  }

  if (block.shape === "triangle") {
    const ax = x + width / 2
    const ay = y + 54
    const bx = x + 70
    const by = y + height - 34
    const cx = x + width - 70
    const cy = by
    doc.lineWidth(2.2).strokeColor(COLORS.border).fillColor(COLORS.blue)
    doc.moveTo(ax, ay).lineTo(bx, by).lineTo(cx, cy).lineTo(ax, ay).fillAndStroke("#dbeafe", COLORS.border)
    ;[[ax, ay, "A"], [bx, by, "B"], [cx, cy, "C"]].forEach(([px, py, label]) => {
      doc.circle(px, py, 5).fill("#f9a8d4")
      doc.fillColor(COLORS.ink).font(FONT.bold).fontSize(11).text(label, px - 4, py - 20, { width: 20, align: "center" })
    })
    doc.fillColor(COLORS.muted).font(FONT.bold).fontSize(9)
    doc.text("AB", x + 96, y + height / 2, { width: 40 })
    doc.text("AC", x + width - 126, y + height / 2, { width: 40 })
    doc.text("BC", x + width / 2 - 14, by + 8, { width: 40 })
    doc.y = y + height + 14
    return
  }

  if (block.shape === "map") {
    doc.roundedRect(x + 80, y + 44, width - 160, height - 72, 36).fill("#dcfce7").stroke(COLORS.border)
    doc.fillColor(COLORS.ink).font(FONT.bold).fontSize(10).text("N", x + width / 2 - 4, y + 50)
    doc.moveTo(x + width / 2, y + 66).lineTo(x + width / 2, y + 86).stroke(COLORS.border)
    doc.circle(x + width / 2 + 44, y + 94, 5).fill("#f472b6")
    doc.roundedRect(x + 130, y + 90, 70, 28, 14).fill("#fef3c7").stroke(COLORS.border)
    doc.roundedRect(x + width - 220, y + height - 58, 100, 12, 6).fill("#bfdbfe").stroke("#2563eb")
    doc.y = y + height + 14
    return
  }

  const top = y + (block.text ? 44 : 24)
  const centerY = top + 36
  const usable = width - 60
  const gap = labels.length > 1 ? usable / Math.min(labels.length - 1, 2) : usable

  labels.slice(0, 6).forEach((label, index) => {
    const row = Math.floor(index / 3)
    const col = index % 3
    const cx = x + 30 + col * gap
    const cy = centerY + row * 70
    doc.circle(cx, cy, 18).fill(pastel(["pink", "yellow", "green", "blue", "purple"][index % 5])).stroke(COLORS.border)
    doc.fillColor(COLORS.ink).font(FONT.bold).fontSize(9.5).text(clean(label), cx - 44, cy + 25, {
      width: 88,
      align: "center"
    })
    if (col < 2 && index < labels.length - 1 && index < 5) {
      doc.moveTo(cx + 23, cy).lineTo(cx + gap - 23, cy).stroke(COLORS.border)
      doc.moveTo(cx + gap - 28, cy - 5).lineTo(cx + gap - 23, cy).lineTo(cx + gap - 28, cy + 5).stroke(COLORS.border)
    }
  })

  doc.y = y + height + 14
}

const drawBlock = (doc, block = {}) => {
  const type = block.type || "paragraph"
  if (type === "heading") return drawSectionHeading(doc, block)
  if (type === "formula") return drawFormula(doc, block)
  if (type === "bullets" || type === "example") return drawBullets(doc, block)
  if (type === "table") return drawTable(doc, block)
  if (type === "flow") return drawFlow(doc, block)
  if (type === "diagram") return drawDiagram(doc, block)
  if (type === "note") return drawNote(doc, block)
  return drawParagraph(doc, block)
}

const normalizePages = (result) => {
  if (Array.isArray(result.notes?.pages) && result.notes.pages.length) {
    return addAutoDiagrams(result.notes.pages.map((page) => normalizePage(page, result)), result)
  }
  if (Array.isArray(result.notes) && result.notes.length) {
    return addAutoDiagrams(result.notes.map((page) => normalizePage(page, result)), result)
  }
  if (Array.isArray(result.notes?.sections) && result.notes.sections.length) {
    return addAutoDiagrams([{ pageTitle: result.notes.chapterTitle || result.title || "Short Notes", blocks: result.notes.sections.map(normalizeBlock) }], result)
  }
  if (result.notes && typeof result.notes === "object" && !Array.isArray(result.notes)) {
    const page = normalizePage(result.notes, result)
    if (page.blocks.length) return addAutoDiagrams([page], result)
  }
  if (Array.isArray(result.pages) && result.pages.length) {
    return addAutoDiagrams(result.pages.map((page) => normalizePage(page, result)), result)
  }
  if (Array.isArray(result.sections) && result.sections.length) {
    return addAutoDiagrams([{ pageTitle: result.title || "Short Notes", blocks: result.sections.map(normalizeBlock) }], result)
  }

  const extracted = collectTextLeaves(result.notes || result)
    .filter((text) => text !== result.title && text !== result.notes?.chapterTitle)
    .slice(0, 28)
  if (extracted.length) {
    return addAutoDiagrams([{
      pageTitle: result.title || result.notes?.chapterTitle || "Short Notes",
      blocks: [
        { type: "heading", color: "green", text: result.title || result.notes?.chapterTitle || "Short Notes" },
        { type: "bullets", color: "blue", title: "Key Points", items: extracted }
      ]
    }], result)
  }

  const text = typeof result.notes === "string"
    ? result.notes
    : typeof result.content === "string"
      ? result.content
      : result.summary || result.explanation || "No notes content available."
  return addAutoDiagrams([{
    pageTitle: result.title || "Short Notes",
    blocks: [
      { type: "heading", color: "green", text: result.title || "Short Notes" },
      { type: "paragraph", color: "yellow", text }
    ]
  }], result)
}

const renderNotes = (doc, result) => {
  const pages = normalizePages(result)
  if (!pages.length) {
    writeText(doc, "No notes content available.", { bold: true, size: 14 })
    return
  }
  pages.forEach((page, index) => {
    if (index > 0) {
      doc.addPage()
      decoratePage(doc)
      doc.y = doc.page.margins.top
    }
    if (index === 0) drawHeader(doc, result)
    if (index > 0 && page.pageTitle) drawSectionHeading(doc, { type: "heading", color: "blue", text: page.pageTitle })
    safeArray(page.blocks).forEach((block) => drawBlock(doc, block))
  })
}

const qaSections = [
  ["Short Questions", "short"],
  ["Long Questions", "long"],
  ["MCQ", "mcq"],
  ["True / False", "trueFalse"],
  ["Fill in the Blanks", "fillBlank"]
]

const renderQuestions = (doc, result) => {
  drawHeader(doc, { ...result, title: result.title || "Question Answer Bank" })
  qaSections.forEach(([title, key]) => {
    const items = safeArray(result.qa?.[key])
    if (!items.length) return
    drawSectionHeading(doc, { text: title, color: key === "mcq" ? "purple" : "blue" })
    items.forEach((item, index) => {
      ensureSpace(doc, key === "mcq" ? 108 : 70)
      writeText(doc, `${index + 1}. ${item.question}`, { bold: true, size: 12.5, moveDown: 0.15 })
      if (key === "mcq") {
        safeArray(item.options).forEach((option, optionIndex) => {
          writeText(doc, `${String.fromCharCode(65 + optionIndex)}. ${option}`, { size: 11, x: doc.page.margins.left + 18, width: pageWidth(doc) - 18, moveDown: 0.05 })
        })
      }
      const answer = Array.isArray(item.answer) ? item.answer.join(" ") : item.answer
      writeText(doc, `Answer: ${answer || ""}`, { bold: true, size: 11.5, color: "#166534", x: doc.page.margins.left + 18, width: pageWidth(doc) - 18 })
      if (item.explanation) writeText(doc, item.explanation, { size: 10.5, color: COLORS.muted, x: doc.page.margins.left + 18, width: pageWidth(doc) - 18 })
      doc.moveDown(0.4)
    })
  })
}

export const pdfDownload = async (req, res) => {
  try {
    const result = unwrapResult(req.body || {})
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 54, left: 48, right: 48 }
    })

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename="${fileNameFrom(result)}.pdf"`)
    res.setHeader("X-PDF-Renderer", "handwritten-v2")
    doc.pipe(res)

    decoratePage(doc)
    if (result.mode === "questions" || result.qa) {
      renderQuestions(doc, result)
    } else {
      renderNotes(doc, result)
    }

    doc.end()
  } catch (error) {
    console.error("PDF download error:", error)
    res.status(500).json({ message: "Failed to generate PDF" })
  }
}
