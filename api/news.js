import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Extract the first JSON array from mixed GPT content
function extractJsonArray(text) {
  const match = text.match(/\[\s*{[\s\S]*?}\s*]/);
  return match ? match[0] : null;
}

// Validate JSON structure
function isValidNewsItem(item) {
  return (
    typeof item.title === 'string' &&
    typeof item.summary === 'string' &&
    typeof item.source === 'string' &&
    typeof item.date === 'string'
  );
}

// Fallback static data
function fallbackNews() {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      title: 'AI Breakthrough Changes the World',
      summary: 'A major AI advancement was announced today, reshaping global industries.',
      source: 'The Example Times',
      date: today,
    },
    {
      title: 'Climate Report Reveals Surprising Trends',
      summary: 'A new report shows unexpected improvements in some regions despite global warming.',
      source: 'Eco Daily',
      date: today,
    },
  ];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const { topic } = req.body || {};
  if (!topic || typeof topic !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "topic" in request body.' });
  }

  try {
    // ✅ Use Web Search tool via Responses API
    const response = await openai.responses.create({
      model: "gpt-4o",
      tools: [
        {
          type: "web_search_preview",
          user_location: {
            country: "NZ",
            city: "Auckland",
            region: "Auckland",
          },
        },
      ],
      tool_choice: { type: "web_search_preview" }, // force web search
      input: `Give me 5 recent news summaries about "${topic}" in raw JSON array format (title, summary, source, date YYYY-MM-DD).`,
    });

    const rawText = response.output_text;
    console.log("🌐 GPT Web Search Output:\n", rawText);

    const jsonText = extractJsonArray(rawText);

    if (!jsonText) {
      console.warn("⚠️ No valid JSON array found. Falling back.");
      return res.status(200).json(fallbackNews());
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      console.error("❌ Failed to parse JSON:", err);
      return res.status(200).json(fallbackNews());
    }

    if (!Array.isArray(parsed) || !parsed.every(isValidNewsItem)) {
      console.warn("⚠️ Invalid structure in parsed results. Falling back.");
      return res.status(200).json(fallbackNews());
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("🔥 OpenAI API Error:", err);
    return res.status(500).json({
      error: err.message || "Unexpected server error.",
      fallback: fallbackNews(),
    });
  }
}
