const { Configuration, OpenAIApi } = require("openai");

const token = process.env["OPENAI_API_KEY"];
const endpoint = "https://api.openai.com/v1";
const modelName = "gpt-4o";

const configuration = new Configuration({
  apiKey: token,
  basePath: endpoint,
});

const openai = new OpenAIApi(configuration);

async function generateQuestions(topic, numQuestions) {
  const maxQuestionsPerRequest = 10;
  let allQuestions = [];

  for (let i = 0; i < Math.ceil(numQuestions / maxQuestionsPerRequest); i++) {
    const questionsToGenerate = Math.min(maxQuestionsPerRequest, numQuestions - i * maxQuestionsPerRequest);
    const questions = await generateQuestionsBatch(topic, questionsToGenerate);
    allQuestions = allQuestions.concat(questions);
  }

  return allQuestions;
}

async function generateQuestionsBatch(topic, numQuestions) {
  try {
    const response = await openai.createChatCompletion({
      model: modelName,
      messages: [
        {
          role: "system",
          content: "You are a quiz question generator. Always respond with a valid JSON array of questions, each containing question, choices (array), and correctAnswer properties."
        },
        {
          role: "user",
          content: `Generate ${numQuestions} unique multiple-choice questions about ${topic}. Respond ONLY with a JSON array in this format: [{"question": "text", "choices": ["a", "b", "c", "d"], "correctAnswer": "correct choice"}, ...]`
        }
      ],
      max_tokens: Math.min(numQuestions * 150, 2048), // Adjusted for multiple questions with an upper limit
      temperature: 0.7,
      top_p: 1.0,
    const validQuestions = questions.filter(q => q.question && Array.isArray(q.choices) && q.correctAnswer && q.choices.includes(q.correctAnswer));

    let questionsData = response.data.choices[0].message.content;

    // Extract JSON array from response
    questionsData = questionsData.substring(
      questionsData.indexOf('['),
      questionsData.lastIndexOf(']') + 1
    );

    const questions = JSON.parse(questionsData);

    // Validate questions
    const validQuestions = questions.filter(q => q.question && Array.isArray(q.choices) && q.correctAnswer);

    return validQuestions;

  } catch (error) {
    console.error('Error generating questions:', error);
    throw new Error('Failed to generate questions');
  }
}

module.exports = { generateQuestions, generateQuestionsBatch };
