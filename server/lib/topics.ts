import OpenAI from "openai";
import { type ChatCompletionMessageParam } from "openai/resources/chat/completions";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY environment variable");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Pre-defined topics for OSINT data classification
const TOPICS = [
  "identity",
  "location",
  "social_media",
  "contact",
  "employment",
  "education",
  "relationships",
  "activities",
  "timeline",
  "misc"
] as const;

type Topic = typeof TOPICS[number];

const SYSTEM_PROMPT = `You are a topic classifier for an OSINT investigation system. 
Given a piece of text, classify it into one of the following topics:
${TOPICS.join(", ")}

Respond with just the topic name, nothing else.
If unsure, respond with "misc".`;

export async function classifyTopic(text: string): Promise<Topic> {
  try {
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      temperature: 0.3,
      max_tokens: 10
    });

    const topic = response.choices[0].message.content?.toLowerCase().trim() as Topic;
    return TOPICS.includes(topic) ? topic : "misc";
  } catch (error) {
    console.error("Error classifying topic:", error);
    return "misc";
  }
}

// Map topics to vibrant cyberpunk colors (in HSL format)
export const TOPIC_COLORS: Record<Topic, string> = {
  identity: "hsl(286, 100%, 70%)", // Neon purple
  location: "hsl(160, 100%, 50%)", // Neon green
  social_media: "hsl(195, 100%, 50%)", // Neon cyan
  contact: "hsl(30, 100%, 50%)", // Neon orange
  employment: "hsl(350, 100%, 60%)", // Neon red
  education: "hsl(55, 100%, 50%)", // Neon yellow
  relationships: "hsl(320, 100%, 65%)", // Neon pink
  activities: "hsl(220, 100%, 60%)", // Neon blue
  timeline: "hsl(120, 100%, 45%)", // Bright green
  misc: "hsl(0, 0%, 70%)" // Gray
};
