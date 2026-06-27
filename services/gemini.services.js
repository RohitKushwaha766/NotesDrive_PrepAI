
const Gemini_URL = 
"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent"

function geminiKeys() {
  return [
    { key: process.env.GEMINI_FREE_API_KEY || process.env.GEMINI_API_KEY, label: "free" },
    { key: process.env.GEMINI_PAID_API_KEY, label: "paid" }
  ].filter((item, index, items) => item.key && items.findIndex((next) => next.key === item.key) === index);
}

function shouldFallback(error) {
  const message = error?.message || "";
  const status = error?.status || 0;
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    /quota|rate|overload|busy|timeout|unavailable/i.test(message)
  );
}

async function callGemini(prompt, apiKey, label) {
  const response = await fetch(`${Gemini_URL}?key=${apiKey}`, {
        method:"POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })

    })

    if (!response.ok) {
      const err = await response.text();
      const error = new Error(err || `Gemini ${label} key failed with ${response.status}`);
      error.status = response.status;
      throw error;
    }

    const data = await response.json()

    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("No text returned from Gemini");
    }

    const cleanText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return parseGeminiJson(cleanText);
}

function parseGeminiJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.search(/[{\[]/);
    const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("Gemini returned invalid JSON");
  }
}

export const generateGeminiResponse = async (prompt) => {
    const keys = geminiKeys();

    if (!keys.length) {
      throw new Error("Gemini API key is not configured");
    }

    let lastError = null;

    for (let index = 0; index < keys.length; index++) {
      const item = keys[index];
      try {
        return await callGemini(prompt, item.key, item.label);
      } catch (error) {
        lastError = error;
        console.error(`Gemini ${item.label} key error:`, error.message);
        if (index === keys.length - 1 || !shouldFallback(error)) {
          break;
        }
        console.warn("Retrying Gemini request with fallback key...");
      }
    }

    throw new Error(lastError?.message || "Server is busy, please try again");
   
}
