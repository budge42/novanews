// api/news.js
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  const { topic } = JSON.parse(req.body || '{}');

  try {
    const response = await openai.responses.create({
      model: 'gpt-4.1',
      tools: [
        {
          type: 'web_search_preview',
          user_location: {
            country: 'NZ',
            city: 'Auckland',
            region: 'Auckland'
          }
        }
      ],
      input: `Summarize 3 factual and recent news stories about "${topic}". Output as JSON list of: [{ "title": "...", "summary": "...", "source": "...", "date": "YYYY-MM-DD" }]`,
      tool_choice: { type: 'web_search_preview' }
    });

    res.status(200).json(response.output.text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
