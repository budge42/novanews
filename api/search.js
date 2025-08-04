import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  const { topic = "positive news today" } = await req.json();

  try {
    const response = await openai.responses.create({
      model: "gpt-4o",
      tools: [{ type: "web_search_preview" }],
      tool_choice: { type: "web_search_preview" },
      input: topic,
    });

    const result =
      response.output?.[1]?.content?.[0]?.text || "No result returned.";

    return new Response(JSON.stringify({ result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Search failed", err);
    return new Response(
      JSON.stringify({ error: "Search failed", detail: err.message }),
      { status: 500 }
    );
  }
}
