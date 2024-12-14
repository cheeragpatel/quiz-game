import OpenAI from "openai";

const token = process.env["GITHUB_TOKEN"];
const endpoint = "https://models.inference.ai.azure.com";
const modelName = "gpt-4o";

export async function main() {

  const client = new OpenAI({ baseURL: endpoint, apiKey: token });

  const response = await client.chat.completions.create({
    messages: [
        { role:"system", content: "You are a helpful assistant." },
        { role:"user", content: "What is the capital of France?" }
      ],
      temperature: 1.0,
      top_p: 1.0,
      max_tokens: 1000,
      model: modelName
    });

  console.log(response.choices[0].message.content);
}

main().catch((err) => {
  console.error("The sample encountered an error:", err);
});

const client = new OpenAI({ baseURL: endpoint, apiKey: token });

async function generateHostQuip(question, winner) {
  try {
    const response = await client.chat.completions.create({
      messages: [
        { role: "system", content: "You are a 70s game show host." },
        { role: "user", content: `Make a quip about the question "${question}" and the winner "${winner}".` }
      ],
      temperature: 1.0,
      top_p: 1.0,
      max_tokens: 50,
      model: modelName
    });

    const quipData = response.choices[0].message.content;
    return quipData;
  } catch (error) {
    console.error('Error generating host quip:', error);
    throw new Error('Failed to generate host quip');
  }
}

async function hostGame(question, winner) {
  try {
    const quip = await generateHostQuip(question, winner);
    console.log(`Host: ${quip}`);
  } catch (error) {
    console.error('Error hosting game:', error);
  }
}

module.exports = {
  generateHostQuip,
  hostGame,
};
