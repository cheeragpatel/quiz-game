import OpenAI from 'openai';
import { ValidationError, GameError } from './utils/errorHandler.js';

const token = process.env['OPENAI_API_KEY'];
const endpoint = 'https://api.openai.com/v1';
const modelName = 'gpt-4o';  // Restored original model name

// Validate environment variables
if (!token) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

const openai = new OpenAI({
  apiKey: token,
  baseURL: endpoint,
});

/**
 * Validates and processes question data from API response
 * @param {string} rawResponse - The raw response from OpenAI
 * @returns {Array} - Array of validated questions
 */
function processQuestionData(rawResponse) {
  try {
    const questionsData = rawResponse.substring(
      rawResponse.indexOf('['),
      rawResponse.lastIndexOf(']') + 1
    );
    
    const questions = JSON.parse(questionsData);
    
    // Validate question structure
    return questions.filter(q => {
      const isValid = q.question && 
        Array.isArray(q.choices) && 
        q.choices.length === 4 && 
        q.correctAnswer && 
        q.choices.includes(q.correctAnswer);
        
      if (!isValid) {
        console.warn('Invalid question structure:', q);
      }
      return isValid;
    });
  } catch (error) {
    throw new GameError('Failed to process question data: ' + error.message);
  }
}

/**
 * Generates quiz questions using OpenAI's API.
 * @param {string} topic - The topic for the questions.
 * @param {number} numQuestions - The total number of questions to generate.
 * @returns {Promise<Array>} - A promise that resolves to an array of questions.
 * @throws {ValidationError} If input parameters are invalid
 * @throws {GameError} If question generation fails
 */
async function generateQuestions(topic, numQuestions) {
  // Input validation
  if (!topic || typeof topic !== 'string') {
    throw new ValidationError('Topic must be a non-empty string');
  }
  
  if (!numQuestions || numQuestions < 1 || numQuestions > 50) {
    throw new ValidationError('Number of questions must be between 1 and 50');
  }

  try {
    const maxQuestionsPerBatch = 10;
    const batches = [];
    const numBatches = Math.ceil(numQuestions / maxQuestionsPerBatch);
    
    // Split into batches of 10 questions max
    for (let i = 0; i < numBatches; i++) {
      const batchSize = Math.min(maxQuestionsPerBatch, numQuestions - i * maxQuestionsPerBatch);
      
      const response = await openai.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: "system",
            content: "You are a quiz question generator. Always respond with a valid JSON array of questions, each containing question, choices (array), and correctAnswer properties."
          },
          {
            role: "user",
            content: `Generate ${batchSize} unique multiple-choice questions about ${topic}. Each question must have exactly 4 choices. Respond ONLY with a JSON array in this format: [{"question": "text", "choices": ["a", "b", "c", "d"], "correctAnswer": "correct choice"}, ...]`
          }
        ],
        max_tokens: 1000,  // Fixed value instead of calculation to avoid issues
        temperature: 0.7,
        top_p: 1.0,
      });

      if (!response.choices?.[0]?.message?.content) {
        throw new GameError('Invalid API response structure');
      }

      const questions = processQuestionData(response.choices[0].message.content);
      if (questions.length === 0) {
        throw new GameError('No valid questions generated in batch');
      }

      batches.push(questions);
    }

    const allQuestions = batches.flat();
    if (allQuestions.length < numQuestions) {
      console.warn(`Only ${allQuestions.length} valid questions generated out of ${numQuestions} requested`);
    }

    return allQuestions;
  } catch (error) {
    if (error instanceof GameError || error instanceof ValidationError) {
      throw error;
    }
    console.error('Error generating questions:', error);
    throw new GameError('Failed to generate questions: ' + error.message);
  }
}

export { generateQuestions };
