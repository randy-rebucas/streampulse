import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod/v4";

const streamSummarySchema = z.object({
  title: z.string().describe("Catchy summary title for the stream replay"),
  tldr: z.string().describe("2-3 sentence summary of the stream"),
  keyTopics: z.array(z.string()).describe("Main topics discussed during the stream"),
  highlights: z.array(
    z.object({
      timestamp: z.string().describe("Approximate time in the stream (e.g., '15:30')"),
      description: z.string().describe("What happened at this moment"),
      type: z.enum(["funny", "important", "question", "announcement"]),
    })
  ),
  sentiment: z.enum(["positive", "neutral", "negative"]).describe("Overall chat sentiment"),
});

export type StreamSummary = z.infer<typeof streamSummarySchema>;

interface ChatMessageInput {
  content: string;
  username: string;
  createdAt: Date;
  isBot: boolean;
}

export async function generateStreamSummary(
  streamTitle: string,
  streamDescription: string,
  chatMessages: ChatMessageInput[],
  streamDurationMinutes: number
): Promise<StreamSummary> {
  const chatLog = chatMessages
    .filter((m) => !m.isBot)
    .map((m) => {
      const minutes = Math.floor(
        (m.createdAt.getTime() - chatMessages[0].createdAt.getTime()) / 60000
      );
      return `[${minutes}m] ${m.username}: ${m.content}`;
    })
    .join("\n");

  const { object } = await generateObject({
    model: openai("gpt-4o"),
    schema: streamSummarySchema,
    prompt: `Analyze this live stream and generate a structured summary.

Stream Title: ${streamTitle}
Stream Description: ${streamDescription || "N/A"}
Stream Duration: ${streamDurationMinutes} minutes
Total Messages: ${chatMessages.length}

Chat Log:
${chatLog.slice(0, 8000)}`,
  });

  return object;
}
