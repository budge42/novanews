import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Extract the first JSON array from mixed GPT content
function extractJsonArray(text) {
  const match = text.match(/\[\s*{[\s\S]*?}\s*]/);
  return match ? match[0] : null;
}

// Ensure news item has correct structure
function isValidNewsItem(item) {
  return (
    typeof item.title === 'string' &&
    typeof item.summary === 'string' &&
    typeof item.source === 'string' &&
    typeof item.date === 'string'
  );
}

// Fallback news in case GPT messes up
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
    // Call GPT-4o
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.5,
      max_tokens: 1200,
      messages: [
        {
          role: 'system',
          content:
            'You are a news journalist. Respond ONLY with a raw JSON array of exactly 5 items, each having: title, summary, source, and date (YYYY-MM-DD). Do NOT include any intro, markdown, or extra text — only return raw JSON array.',
        },
        {
          role: 'user',
          content: `Please give me 5 concise news summaries about: "${topic}"`,
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || '';
    console.log('🔍 GPT raw output:\n', raw);

    const jsonText = extractJsonArray(raw);

    if (!jsonText) {
      console.warn('⚠️ GPT returned no valid JSON array. Falling back.');
      return res.status(200).json(fallbackNews());
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      console.error('❌ Failed to parse GPT JSON:', err);
      return res.status(200).json(fallbackNews());
    }

    if (!Array.isArray(parsed) || !parsed.every(isValidNewsItem)) {
      console.warn('⚠️ GPT returned invalid structure. Falling back.');
      return res.status(200).json(fallbackNews());
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('🔥 OpenAI API Error:', err);
    return res.status(500).json({
      error: err.message || 'Unexpected server error.',
      fallback: fallbackNews(),
    });
  }
}
