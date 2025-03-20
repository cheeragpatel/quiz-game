import OpenAI from 'openai';
import { ValidationError, GameError } from './utils/errorHandler.js';

const token = process.env['OPENAI_API_KEY'];
const endpoint = process.env['OPENAI_API_ENDPOINT']; 
const modelName = 'gpt-4o';  // Restored original model name

// Retry configuration
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;

// Validate environment variables
if (!token) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

const openai = new OpenAI({
  apiKey: token,
  baseURL: endpoint,
});

/**
 * Sleep function for implementing delays
 * @param {number} ms - milliseconds to sleep
 * @returns {Promise} - resolves after the specified time
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Makes an API call with retry logic for rate limiting
 * @param {Function} apiCall - Function that makes the actual API call
 * @returns {Promise} - Result of the API call
 */
async function callWithRetry(apiCall) {
  let retries = 0;
  const MAX_RETRIES = parseInt(process.env.API_MAX_RETRIES || '5', 10);
  let delay = INITIAL_RETRY_DELAY_MS;
  
  while (true) {
    try {
      return await apiCall();
    } catch (error) {
      // Enhanced error logging
      console.error(`API call failed:`, {
        status: error.status || (error.response && error.response.status),
        message: error.message,
        code: error.code
      });
      
      // Check if we've hit rate limits (429) or if it's a server error (5xx)
      const errorStatus = error.status || (error.response && error.response.status);
      const shouldRetry = errorStatus === 429 || (errorStatus >= 500 && errorStatus < 600);
      
      if (!shouldRetry || retries >= MAX_RETRIES) {
        // Better error propagation
        const enhancedError = new Error(`API request failed: ${error.message}`);
        enhancedError.originalError = error;
        enhancedError.isRateLimit = errorStatus === 429;
        throw enhancedError;
      }
      
      // Exponential backoff with jitter
      console.log(`Rate limit hit or server error (${errorStatus}). Retrying in ${delay}ms... (Attempt ${retries + 1}/${MAX_RETRIES})`);
      await sleep(delay);
      
      // Increase delay for next retry (exponential backoff with jitter)
      delay = Math.min(delay * 2 * (0.9 + Math.random() * 0.2), MAX_RETRY_DELAY_MS);
      retries++;
    }
  }
}

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
 * Generates quiz questions using OpenAI's API with retry mechanism.
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
    const maxQuestionsPerBatch = 5; // Reduced from 10 to reduce API load
    const batches = [];
    const numBatches = Math.ceil(numQuestions / maxQuestionsPerBatch);
    
    // Split into batches of 5 questions max to reduce API load
    for (let i = 0; i < numBatches; i++) {
      const batchSize = Math.min(maxQuestionsPerBatch, numQuestions - i * maxQuestionsPerBatch);
      
      // Use the retry mechanism for API calls
      const response = await callWithRetry(async () => {
        return await openai.chat.completions.create({
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
          max_tokens: 800,  // Reduced to save tokens
          temperature: 0.7,
          top_p: 1.0,
        });
      });
      
      if (!response.choices?.[0]?.message?.content) {
        throw new GameError('Invalid API response structure');
      }
      
      const questions = processQuestionData(response.choices[0].message.content);
      if (questions.length === 0) {
        throw new GameError('No valid questions generated in batch');
      }
      
      batches.push(questions);
      
      // Add delay between batches to avoid rate limiting
      if (i < numBatches - 1) {
        await sleep(1000);
      }
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
