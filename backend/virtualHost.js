const { Configuration, OpenAIApi } = require("openai");

const token = process.env["OPENAI_API_KEY"];
const endpoint = "https://api.openai.com/v1";
const modelName = "gpt-4o";

const configuration = new Configuration({
  apiKey: token,
  basePath: endpoint,
});

const openai = new OpenAIApi(configuration);

async function generateHostQuip(question, winner) {
  try {
    const response = await openai.createChatCompletion({
      model: modelName,
      messages: [
        { role: "system", content: "You are a 70s game show host named Mona Woolery, in the style of Chuck Woolery." },
        { role: "user", content: `Make a quip about the question "${question}" and the winner "${winner}".` }
      ],
      max_tokens: 50,
      temperature: 1.0,
      top_p: 1.0,
    });

    const quip = response.data.choices[0].message.content;
    return quip.trim();
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
