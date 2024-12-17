const { Configuration, OpenAIApi } = require("openai");

const token = process.env["OPENAI_API_KEY"];
const endpoint = "https://api.openai.com/v1";
const modelName = "gpt-4o";

const configuration = new Configuration({
  apiKey: token,
  basePath: endpoint,
});

const openai = new OpenAIApi(configuration);

/**
 * Helper function to generate a prompt for the OpenAI API.
 * @param {string} context - The context for the prompt.
 * @param {string} winners - The winners or correct answer.
 * @returns {string} - The generated prompt.
 */
function generatePrompt(context, winners) {
  if (context === 'no winners') {
    const prompts = [
      `Ouch! Not a single correct answer! The answer was "${winners}". Here's a witty 70's game show host comment about everyone getting it wrong...`,
      `Nobody got this one! The correct answer was "${winners}". Give me a funny, encouraging 70's game show host response...`,
      `Strike out! The answer was "${winners}". Share a humorous 70's style game show host quip about the collective miss...`
    ];
    return prompts[Math.floor(Math.random() * prompts.length)];
  } else {
    return context;
  }
}

async function generateHostQuip(context, winners) {
  try {
    const prompt = generatePrompt(context, winners);
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
    let context;
    let winners;
    if (Array.isArray(winner) && winner.length > 1) {
      context = `Make a witty quip about a tie between ${winner.join(' and ')} on the question "${question}".`;
      winners = winner;
    } else if (winner.length === 0) {
      context = 'no winners';
      winners = 'the correct answer';
    } else {
      context = `Make a quip about the question "${question}" and the winner "${winner[0]}".`;
      winners = winner[0];
    }

    const quip = await generateHostQuip(context, winners);
    console.log(`Host: ${quip}`);
  } catch (error) {
    console.error('Error hosting game:', error);
  }
}

async function generateGoodbyeQuip() {
  try {
    const response = await openai.createChatCompletion({
      model: modelName,
      messages: [
        {
          role: "system",
          content: "You are a 70's game show host named Mona Woolery in the style of Bob Barker and Chuck Woolery. Keep responses concise and under 200 characters."
        },
        {
          role: "user",
          content: "Generate a warm, fun goodbye message to end the game show, mentioning how great everyone played."
        }
      ],
      max_tokens: 50,
      temperature: 1.0,
      top_p: 1.0,
    });

    let quip = response.data.choices[0].message?.content;
    return quip ? quip.trim() : "That's our show folks! See you next time!";
  } catch (error) {
    console.error('Error generating goodbye quip:', error);
    return "And that's the way it is! Goodbye everybody!";
  }
}

async function generateIntroductionQuip() {
  try {
    const response = await openai.createChatCompletion({
      model: modelName,
      messages: [
        {
          role: "system",
          content: "You are a 70's game show host named Mona Woolery in the style of Bob Barker and Chuck Woolery. Keep responses concise and under 200 characters."
        },
        {
          role: "user",
          content: "Introduce yourself as the host of this quiz game show with enthusiasm and 70's flair!"
        }
      ],
      max_tokens: 50,
      temperature: 1.0,
      top_p: 1.0,
    });

    let quip = response.data.choices[0].message?.content;
    return quip ? quip.trim() : "Hi folks! I'm Mona Woolery, and this is THE QUIZ SHOW!";
  } catch (error) {
    console.error('Error generating introduction quip:', error);
    return "Hi folks! I'm Mona Woolery, and this is THE QUIZ SHOW!";
  }
}

module.exports = {
  generateHostQuip,
  hostGame,
  generateGoodbyeQuip,
  generateIntroductionQuip
};
