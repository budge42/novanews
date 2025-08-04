const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = async (req, res) => {
  try {
    const { topic } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful journalist who writes short summaries of the latest news. Output in array of {title, summary, source, date} in JSON.",
        },
        {
          role: "user",
          content: `Give me 5 news summaries about "${topic}".`,
        },
      ],
    });

    // Extract the content string
    const content = completion.choices?.[0]?.message?.content || "[]";

    // Ensure it's valid JSON and parse it
    const data = JSON.parse(content);
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || "Unknown error" });
  }
};

