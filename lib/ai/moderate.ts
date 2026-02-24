import OpenAI from "openai";

const openai = new OpenAI();

export interface ModerationResult {
  allowed: boolean;
  flagged: boolean;
  categories: string[];
  message?: string;
}

export async function moderateMessage(
  content: string
): Promise<ModerationResult> {
  try {
    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: content,
    });

    const result = moderation.results[0];

    if (result.flagged) {
      const flaggedCategories = Object.entries(result.categories)
        .filter(([, flagged]) => flagged)
        .map(([category]) => category);

      return {
        allowed: false,
        flagged: true,
        categories: flaggedCategories,
        message:
          "Your message was flagged for inappropriate content and was not sent.",
      };
    }

    return {
      allowed: true,
      flagged: false,
      categories: [],
    };
  } catch (error) {
    console.error("Moderation API error:", error);
    // Allow message through if moderation fails (fail-open)
    return {
      allowed: true,
      flagged: false,
      categories: [],
    };
  }
}
