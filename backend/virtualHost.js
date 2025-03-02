import OpenAI from 'openai';
import { ValidationError, GameError } from './utils/errorHandler.js';

const token = process.env["OPENAI_API_KEY"];
const endpoint = "https://api.openai.com/v1";
const modelName = "gpt-4o";  // Restored original model name

// Validate environment variables
if (!token) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

const openai = new OpenAI({
  apiKey: token,
  baseURL: endpoint,
});

const baseSystemPrompt = "You are a 70's game show host named Mona Woolery in the style of Bob Barker and Chuck Woolery. Keep responses concise and under 200 characters.";

/**
 * Generate a host response using OpenAI's API.
 * @param {string} prompt - The prompt for the host.
 * @returns {Promise<string>} - The generated response.
 * @throws {ValidationError} If prompt is invalid
 * @throws {GameError} If API call fails
 */
async function generateHostResponse(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    throw new ValidationError('Prompt must be a non-empty string');
  }

  try {
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: baseSystemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: 50,
      temperature: 1.0,
      top_p: 1.0,
    });

    if (!response.choices?.[0]?.message?.content) {
      throw new GameError('Invalid API response structure');
    }

    const quip = response.choices[0].message.content.trim();
    return quip || "Right on!";
  } catch (error) {
    if (error instanceof GameError || error instanceof ValidationError) {
      throw error;
    }
    console.error('Error generating host response:', error);
    throw new GameError('Failed to generate host response: ' + error.message);
  }
}

/**
 * Generate a host quip based on game context.
 * @param {string} context - The context for the quip.
 * @param {string|string[]} winners - The winner(s) or correct answer.
 * @returns {Promise<string>} - The generated quip.
 * @throws {ValidationError} If input parameters are invalid
 * @throws {GameError} If quip generation fails
 */
async function generateHostQuip(context, winners) {
  if (!context || typeof context !== 'string') {
    throw new ValidationError('Context must be a non-empty string');
  }

  if (!winners || (typeof winners !== 'string' && !Array.isArray(winners))) {
    throw new ValidationError('Winners must be a string or array');
  }

  try {
    let prompt;
    if (context === 'no winners') {
      const templates = [
        `Ouch! Not a single correct answer! The answer was "${winners}". Here's a witty 70's game show host comment about everyone getting it wrong...`,
        `Nobody got this one! The correct answer was "${winners}". Give me a funny, encouraging 70's game show host response...`,
        `Strike out! The answer was "${winners}". Share a humorous 70's style game show host quip about the collective miss...`
      ];
      prompt = templates[Math.floor(Math.random() * templates.length)];
    } else if (Array.isArray(winners) && winners.length > 1) {
      prompt = `Make a witty quip about a tie between ${winners.join(' and ')} on the question "${context}".`;
    } else {
      const winner = Array.isArray(winners) ? winners[0] : winners;
      prompt = `Make a quip about the question "${context}" and the winner "${winner}".`;
    }
    
    return generateHostResponse(prompt);
  } catch (error) {
    if (error instanceof GameError || error instanceof ValidationError) {
      throw error;
    }
    console.error('Error generating host quip:', error);
    throw new GameError('Failed to generate host quip: ' + error.message);
  }
}

/**
 * Generate a goodbye message for the show.
 * @returns {Promise<string>} - The generated goodbye message.
 * @throws {GameError} If message generation fails
 */
async function generateGoodbyeQuip() {
  try {
    return generateHostResponse("Generate a warm, fun goodbye message to end the game show, mentioning how great everyone played.");
  } catch (error) {
    console.error('Error generating goodbye quip:', error);
    throw new GameError('Failed to generate goodbye message: ' + error.message);
  }
}

/**
 * Generate an introduction for the show.
 * @returns {Promise<string>} - The generated introduction.
 * @throws {GameError} If introduction generation fails
 */
async function generateIntroductionQuip() {
  try {
    return generateHostResponse("Introduce yourself as the host of this quiz game show with enthusiasm and 70's flair!");
  } catch (error) {
    console.error('Error generating introduction:', error);
    throw new GameError('Failed to generate introduction: ' + error.message);
  }
}

export {
  generateHostQuip,
  generateGoodbyeQuip,
  generateIntroductionQuip
};
