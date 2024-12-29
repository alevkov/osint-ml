// Pre-defined topics for OSINT data classification
export const TOPICS = [
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

export type Topic = typeof TOPICS[number];

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
