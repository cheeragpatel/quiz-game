const axios = require('axios');

const GPT4O_API_URL = 'https://api.gpt-4o.com/generate';

async function generateQuestion(topic) {
  try {
    const response = await axios.post(GPT4O_API_URL, {
      prompt: `Generate a multiple choice question about ${topic}.`,
      max_tokens: 100,
    });

    const questionData = response.data;
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
