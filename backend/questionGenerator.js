const { Configuration, OpenAIApi } = require("openai");

const token = process.env["OPENAI_API_KEY"];
const endpoint = "https://api.openai.com/v1";
const modelName = "gpt-4o";

const configuration = new Configuration({
  apiKey: token,
  basePath: endpoint,
});

const openai = new OpenAIApi(configuration);

async function generateQuestion(topic) {
  try {
    const response = await openai.createChatCompletion({
      model: modelName,
      messages: [
        { 
          role: "system", 
          content: "You are a quiz question generator. Always respond with valid JSON containing question, choices (array), and correctAnswer properties."
        },
        { 
          role: "user", 
          content: `Generate a multiple choice question about ${topic}. Respond ONLY with JSON in this format: {"question": "text", "choices": ["a", "b", "c", "d"], "correctAnswer": "correct choice"}` 
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
      top_p: 1.0,
    });

    let questionData = response.data.choices[0].message.content;
    
    // Remove any non-JSON content
    questionData = questionData.substring(
      questionData.indexOf('{'),
      questionData.lastIndexOf('}') + 1
    );

    try {
      const data = JSON.parse(questionData);
      if (!data.question || !Array.isArray(data.choices) || !data.correctAnswer) {
        throw new Error('Invalid question format');
      }
      return {
        question: data.question,
        choices: data.choices,
        correctAnswer: data.correctAnswer,
      };
    } catch (parseError) {
      console.error('Failed to parse question JSON:', parseError);
      return {
        question: 'What is the capital of France?',
        choices: ['Paris', 'London', 'Berlin', 'Madrid'],
        correctAnswer: 'Paris'
      };
    }
  } catch (error) {
    console.error('Error generating question:', error);
    throw new Error('Failed to generate question');
  }
}

module.exports = { generateQuestion };
