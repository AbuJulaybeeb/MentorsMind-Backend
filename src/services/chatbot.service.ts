import axios from "axios";
import { logger } from "../utils/logger.utils";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export interface UserProfile {
  id: string;
  name: string;
  role: "mentor" | "mentee";
  language?: string;
}

export interface ChatbotMessage {
  id: string;
  userId: string;
  message: string;
  response: string;
  intent: string;
  confidence: number;
  escalated: boolean;
  timestamp: Date;
}

export interface ChatbotContext {
  userId: string;
  conversationHistory: Message[];
  userProfile: UserProfile;
  currentIntent: string;
  entities: Record<string, unknown>;
}

export interface ChatbotAnalytics {
  totalMessages: number;
  escalatedCount: number;
  topIntents: Record<string, number>;
  avgConfidence: number;
}

const INTENT_PATTERNS: Record<string, RegExp[]> = {
  booking: [/book|schedule|session|appointment/i],
  payment: [/pay|invoice|billing|charge|refund/i],
  profile: [/profile|account|settings|update/i],
  support: [/help|issue|problem|error|bug/i],
  onboarding: [/start|begin|how to|getting started|new/i],
};

export class ChatbotService {
  private readonly openaiApiKey = process.env.OPENAI_API_KEY;
  private readonly contexts = new Map<string, ChatbotContext>();
  private readonly messageLog: ChatbotMessage[] = [];

  async chat(
    userId: string,
    message: string,
    userProfile: UserProfile,
  ): Promise<ChatbotMessage> {
    const context = this.getOrCreateContext(userId, userProfile);
    const { intent, confidence } = this.classifyIntent(message);

    context.currentIntent = intent;
    context.conversationHistory.push({
      role: "user",
      content: message,
      timestamp: new Date(),
    });

    const escalated = confidence < 0.4 || intent === "support";
    const response = escalated
      ? await this.escalateToHuman(userId, message)
      : await this.getLLMResponse(context, message, userProfile.language);

    context.conversationHistory.push({
      role: "assistant",
      content: response,
      timestamp: new Date(),
    });

    const record: ChatbotMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      userId,
      message,
      response,
      intent,
      confidence,
      escalated,
      timestamp: new Date(),
    };

    this.messageLog.push(record);
    logger.info(
      `Chatbot: user=${userId} intent=${intent} confidence=${confidence} escalated=${escalated}`,
    );
    return record;
  }

  private classifyIntent(message: string): {
    intent: string;
    confidence: number;
  } {
    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      if (patterns.some((p) => p.test(message))) {
        return { intent, confidence: 0.8 };
      }
    }
    return { intent: "general", confidence: 0.5 };
  }

  private async getLLMResponse(
    context: ChatbotContext,
    message: string,
    language = "en",
  ): Promise<string> {
    if (!this.openaiApiKey) {
      return this.getFallbackResponse(context.currentIntent);
    }

    try {
      const messages = [
        {
          role: "system",
          content: `You are a helpful assistant for MentorsMind platform. 
User role: ${context.userProfile.role}. 
Current intent: ${context.currentIntent}.
Respond in language: ${language}.
Be concise and helpful.`,
        },
        ...context.conversationHistory.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user", content: message },
      ];

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        { model: "gpt-4", messages, max_tokens: 300 },
        { headers: { Authorization: `Bearer ${this.openaiApiKey}` } },
      );

      return response.data.choices[0].message.content;
    } catch (err) {
      logger.error("LLM request failed", err);
      return this.getFallbackResponse(context.currentIntent);
    }
  }

  private async escalateToHuman(
    userId: string,
    _message: string,
  ): Promise<string> {
    logger.info(`Escalating conversation for user ${userId} to human support`);
    return (
      "I'm connecting you with a human support agent who can better assist you. " +
      "Please expect a response within 24 hours. Your message has been recorded."
    );
  }

  private getFallbackResponse(intent: string): string {
    const responses: Record<string, string> = {
      booking:
        "To book a session, go to the Sessions tab and select an available mentor.",
      payment:
        "For payment issues, visit your Billing settings or contact support@mentorsmind.com.",
      profile: "You can update your profile in Account Settings.",
      onboarding:
        "Welcome! Start by completing your profile and browsing available mentors.",
      general:
        "I'm here to help! Could you provide more details about your question?",
    };
    return responses[intent] ?? responses.general;
  }

  private getOrCreateContext(
    userId: string,
    userProfile: UserProfile,
  ): ChatbotContext {
    if (!this.contexts.has(userId)) {
      this.contexts.set(userId, {
        userId,
        conversationHistory: [],
        userProfile,
        currentIntent: "general",
        entities: {},
      });
    }
    return this.contexts.get(userId)!;
  }

  clearHistory(userId: string): void {
    const context = this.contexts.get(userId);
    if (context) {
      context.conversationHistory = [];
      context.currentIntent = "general";
    }
  }

  getAnalytics(): ChatbotAnalytics {
    const topIntents: Record<string, number> = {};
    let totalConfidence = 0;
    let escalatedCount = 0;

    this.messageLog.forEach((m) => {
      topIntents[m.intent] = (topIntents[m.intent] ?? 0) + 1;
      totalConfidence += m.confidence;
      if (m.escalated) escalatedCount++;
    });

    return {
      totalMessages: this.messageLog.length,
      escalatedCount,
      topIntents,
      avgConfidence:
        this.messageLog.length > 0
          ? totalConfidence / this.messageLog.length
          : 0,
    };
  }
}

export const chatbotService = new ChatbotService();
