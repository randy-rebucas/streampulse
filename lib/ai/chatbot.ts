import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

interface ChatMessage {
  username: string;
  content: string;
}

export function shouldBotRespond(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return (
    lowerMessage.includes("@bot") ||
    lowerMessage.includes("@ai") ||
    lowerMessage.includes("@streampulse")
  );
}

export async function generateBotResponse(
  streamTitle: string,
  streamDescription: string,
  recentMessages: ChatMessage[],
  triggerMessage: string
): Promise<string> {
  const context = recentMessages
    .slice(-20)
    .map((m) => `${m.username}: ${m.content}`)
    .join("\n");

  const result = await streamText({
    model: openai("gpt-4o-mini"),
    system: `You are StreamPulse AI, a friendly and helpful chat assistant for a live stream.

Stream Title: ${streamTitle}
Stream Description: ${streamDescription || "No description provided"}

Rules:
- Keep responses concise (under 200 characters when possible)
- Be engaging, fun, and relevant to the stream
- Answer questions about the stream when possible
- Be supportive and positive
- Never generate harmful or inappropriate content
- If you don't know something, say so honestly`,
    messages: [
      {
        role: "user",
        content: `Recent chat context:\n${context}\n\nRespond to this message: "${triggerMessage}"`,
      },
    ],
    maxOutputTokens: 150,
  });

  let fullResponse = "";
  for await (const chunk of result.textStream) {
    fullResponse += chunk;
  }

  return fullResponse;
}
