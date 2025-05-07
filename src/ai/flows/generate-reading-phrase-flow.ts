'use server';
/**
 * @fileOverview Generates random short sentences for audio recording.
 *
 * - generateReadingPhrase - A function that generates a phrase.
 * - GenerateReadingPhraseInput - The input type for the generateReadingPhrase function.
 * - GenerateReadingPhraseOutput - The return type for the generateReadingPhrase function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateReadingPhraseInputSchema = z.object({
  language: z.enum(['Sinhala', 'Tamil']).describe('The language for the phrase (Sinhala or Tamil).'),
});
export type GenerateReadingPhraseInput = z.infer<typeof GenerateReadingPhraseInputSchema>;

const GenerateReadingPhraseOutputSchema = z.object({
  phrase: z.string().describe('A short sentence in the specified language, designed to be read aloud in approximately 8-15 seconds.'),
});
export type GenerateReadingPhraseOutput = z.infer<typeof GenerateReadingPhraseOutputSchema>;

export async function generateReadingPhrase(input: GenerateReadingPhraseInput): Promise<GenerateReadingPhraseOutput> {
  return generateReadingPhraseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateReadingPhrasePrompt',
  input: {schema: GenerateReadingPhraseInputSchema},
  output: {schema: GenerateReadingPhraseOutputSchema},
  prompt: `You are a creative assistant tasked with generating short, natural-sounding sentences for a voice recording application.
The sentence should be in {{language}}.
The sentence must be suitable for a native speaker to read aloud in approximately 8 to 15 seconds.
The sentence should be grammatically correct, common, and easy to understand. Avoid complex jargon, proper nouns (unless very common like a country name), or overly specific topics.
Generate only one sentence.

Language: {{language}}
Desired reading time: 8-15 seconds.

Example for Sinhala (if language is Sinhala): "අහස නිල් පාටයි, සමහර වලාකුළු සුදු පාටයි, ඒ වගේම හිරු එළිය දීප්තිමත්ව බබලනවා."
Example for Tamil (if language is Tamil): "வானம் நீல நிறமாகவும், சில மேகங்கள் வெண்மையாகவும், சூரியன் பிரகாசமாகவும் பிரகாசிக்கிறது."

Return ONLY the generated sentence as the 'phrase' output.
`,
});

const generateReadingPhraseFlow = ai.defineFlow(
  {
    name: 'generateReadingPhraseFlow',
    inputSchema: GenerateReadingPhraseInputSchema,
    outputSchema: GenerateReadingPhraseOutputSchema,
  },
  async (input) => {
    // For very short generations like this, a higher temperature can lead to more varied and natural sentences.
    // However, for consistency in meeting the "8-15 second" read time, a moderate temperature is safer.
    const {output} = await prompt(input, {temperature: 0.6});
    return output!;
  }
);
