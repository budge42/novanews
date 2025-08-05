import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function stripMarkdownCodeBlocks(text) {
  return text.replace(/```(?:json)?\s*|```/g, '').trim();
}

function isValidNewsItem(item) {
  return (
    typeof item.title === 'string' &&
    typeof item.summary === 'string' &&
    typeof item.source === 'string' &&
    typeof item.date === 'string'
  );
}

function fallbackNews() {
  return [
    {
      title: 'AI Breakthrough Changes the World',
      summary: 'A major AI advancement was announced today, reshaping global industries.',
      source: 'The Example Times',
      date: new Date().toISOString().split('T')[0],
    },
    {
      title: 'Climate Report Reveals Surprising Trends',
      summary: 'A new report shows unexpected improvements in some regions despite global warming.',
      source: 'Eco Daily',
      date: new Date().toISOString().split('T')[0],
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
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful journalist. Return exactly 5 concise, factual, unbiased news items as a raw JSON array. Each item must include: title, summary, source, and date (YYYY-MM-DD). No commentary. No markdown. Just raw JSON.',
        },
        {
          role: 'user',
          content: `Please provide 5 short news summaries about: "${topic}"`,
        },
      ],
    });

    let content = completion.choices?.[0]?.message?.content || '[]';
    content = stripMarkdownCodeBlocks(content);

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseErr) {
      console.error('❌ JSON parse error:', parseErr);
      throw new Error('Failed to parse JSON from OpenAI response.');
    }

    // Validate that it's an array of valid news items
    if (!Array.isArray(parsed) || !parsed.every(isValidNewsItem)) {
      console.warn('⚠️ Invalid format from OpenAI, returning fallback.');
      return res.status(200).json(fallbackNews());
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('🔥 API Error:', err);
    return res.status(500).json({
      error: err.message || 'Unexpected server error.',
      fallback: fallbackNews(),
    });
  }
}

