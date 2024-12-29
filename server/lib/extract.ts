import OpenAI from "openai";
import { type ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { classifyTopic } from "./topics";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY environment variable");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are an OSINT data extractor. Extract structured data points from the given text.
Each data point should be a single piece of information that can stand on its own.
Format each data point as a separate line.

Example input:
"John Smith works at Apple Inc. as a software engineer. He lives in San Francisco and graduated from MIT in 2015."

Example output:
Name: John Smith
Employment: Works at Apple Inc. as a software engineer
Location: Lives in San Francisco
Education: Graduated from MIT in 2015

Important: Do not include explanatory text or formatting. Only output the data points, one per line.
Focus on factual information that can be verified.`;

export interface ExtractedDataPoint {
  content: string;
  topic?: string;
}

export async function extractDataPoints(
  text: string,
): Promise<ExtractedDataPoint[]> {
  try {
    // Split text into chunks if it's too long (max 4000 tokens)
    const chunks = splitText(text);
    const allDataPoints: ExtractedDataPoint[] = [];

    for (const chunk of chunks) {
      const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: chunk },
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o-2024-08-06",
        messages,
        temperature: 0.3,
      });

      const extractedText = response.choices[0].message.content;
      if (!extractedText) continue;

      // Process each line as a separate data point
      const dataPoints = extractedText
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => ({
          content: line.trim(),
        }));

      // Classify topics for each data point
      const dataPointsWithTopics = await Promise.all(
        dataPoints.map(async (dp) => ({
          ...dp,
          topic: await classifyTopic(dp.content),
        })),
      );

      allDataPoints.push(...dataPointsWithTopics);
    }

    return allDataPoints;
  } catch (error) {
    console.error("Error extracting data points:", error);
    throw error;
  }
}

// Split text into chunks of roughly equal size if it's too long
function splitText(text: string, maxChunkLength = 4000): string[] {
  const chunks: string[] = [];
  let currentChunk = "";

  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > maxChunkLength) {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = "";
      }
      // If a single paragraph is too long, split it by sentences
      if (paragraph.length > maxChunkLength) {
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > maxChunkLength) {
            chunks.push(currentChunk);
            currentChunk = sentence;
          } else {
            currentChunk += sentence;
          }
        }
      } else {
        currentChunk = paragraph;
      }
    } else {
      currentChunk += (currentChunk ? "\n" : "") + paragraph;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}
