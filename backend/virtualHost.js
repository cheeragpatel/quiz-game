const { Configuration, OpenAIApi } = require("openai");

const token = process.env["OPENAI_API_KEY"];
const endpoint = "https://api.openai.com/v1";
const modelName = "gpt-4o";

const configuration = new Configuration({
  apiKey: token,
  basePath: endpoint,
});

const openai = new OpenAIApi(configuration);

async function generateHostQuip(prompt) {
  try {
    const response = await openai.createChatCompletion({
      model: modelName,
      messages: [
        {
          role: "system",
          content: "You are a 70's game show host named Mona Woolery in the style of Bob Barker and Chuck Woolery. Keep responses concise and under 200 characters."
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 50,
      temperature: 1.0,
      top_p: 1.0,
    });

    let quip = response.data.choices[0].message?.content;
    quip = quip ? quip.trim() : "Right on!";
    return quip;
  } catch (error) {
    console.error('Error generating host quip:', error);
    return 'Groovy!';
  }
}

async function hostGame(question, winner) {
  try {
    const prompt = Array.isArray(winner) && winner.length > 1
      ? `Make a witty quip about a tie between ${winner.join(' and ')} on the question "${question}".`
      : `Make a quip about the question "${question}" and the winner "${winner ? winner[0] : 'nobody'}".`;

    const quip = await generateHostQuip(prompt);
    console.log(`Host: ${quip}`);
  } catch (error) {
    console.error('Error hosting game:', error);
  }
}

module.exports = {
  generateHostQuip,
  hostGame,
};
