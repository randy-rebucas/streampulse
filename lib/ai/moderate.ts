import OpenAI from "openai";

const openai = new OpenAI();

export interface ModerationResult {
  allowed: boolean;
  flagged: boolean;
  categories: string[];
  message?: string;
}

export async function moderateMessage(
  content: string,
  /** 0–1 score threshold above which a category is considered flagged. Default 0.5 */
  threshold = 0.5
): Promise<ModerationResult> {
  try {
    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: content,
    });

    const result = moderation.results[0];

    // Use category_scores so we can apply the custom threshold
    const flaggedCategories = Object.entries(result.category_scores ?? {})
      .filter(([, score]) => (score as number) >= threshold)
      .map(([category]) => category);

    if (result.flagged || flaggedCategories.length > 0) {
      return {
        allowed: false,
        flagged: true,
        categories: flaggedCategories,
        message: "Your message was flagged for inappropriate content and was not sent.",
      };
    }

    return { allowed: true, flagged: false, categories: [] };
  } catch (error) {
    console.error("Moderation API error:", error);
    return { allowed: true, flagged: false, categories: [] };
  }
}
