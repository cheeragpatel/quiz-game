import OpenAI from "openai";

const token = process.env["GITHUB_TOKEN"];
const endpoint = "https://models.inference.ai.azure.com";
const modelName = "gpt-4o";

const client = new OpenAI({ baseURL: endpoint, apiKey: token });

async function generateQuestion(topic) {
  try {
    const response = await client.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: `Generate a multiple choice question about ${topic}.` }
      ],
      temperature: 1.0,
      top_p: 1.0,
      max_tokens: 100,
      model: modelName
    });

    const questionData = response.choices[0].message.content;
    return {
      question: questionData.question,
      choices: questionData.choices,
      correctAnswer: questionData.correctAnswer,
    };
  } catch (error) {
    console.error('Error generating question:', error);
    throw new Error('Failed to generate question');
  }
}

async function fetchQuestions(topics) {
  const questions = [];
  for (const topic of topics) {
    const question = await generateQuestion(topic);
    questions.push(question);
  }
  return questions;
}

module.exports = {
  generateQuestion,
  fetchQuestions,
};
