import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/index.js';

const ESCALATION_KEYWORDS = [
  'connect to agent',
  'connect me to an agent',
  'talk to human',
  'talk to a human',
  'speak to agent',
  'speak to an agent',
  'real person',
  'human agent',
  'live agent',
  'customer service representative',
  'speak to someone',
  'talk to someone',
  'real representative',
  'connect me to support',
  'i want an agent',
  'i need an agent',
  'transfer to agent',
  'get me an agent',
];

const SYSTEM_PROMPT = `You are Zomi, a friendly and helpful AI customer support assistant for Zomato — a popular food delivery and restaurant platform. Your role is to help customers with their queries related to:

1. **Order Issues**: Order status, tracking, delays, wrong orders, missing items
2. **Refunds & Cancellations**: Refund requests, cancellation policies, refund status
3. **Payment Issues**: Failed payments, double charges, payment methods
4. **Delivery Issues**: Late delivery, delivery partner issues, address changes
5. **Restaurant Feedback**: Food quality, restaurant reviews
6. **Account Issues**: Profile updates, address management, login issues
7. **Promotions & Offers**: Coupon codes, discounts, loyalty programs

Guidelines:
- Be warm, empathetic, and professional
- Keep responses concise (2-4 sentences max)
- If you can resolve the issue, do so with clear instructions
- If the customer seems frustrated or the issue requires human intervention, suggest they can type "connect to an agent" to reach a human support agent
- Never make up order numbers, tracking details, or specific account information
- For order-specific queries, ask for the order number and provide general guidance
- Always acknowledge the customer's concern before providing solutions
- Use a friendly but professional tone — no excessive emojis`;

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

const conversationHistories = new Map<string, ConversationMessage[]>();

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (config.anthropic.apiKey && !anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: config.anthropic.apiKey });
  }
  return anthropicClient;
}

export function checkEscalation(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return ESCALATION_KEYWORDS.some((kw) => lower.includes(kw));
}

export async function getAIResponse(
  chatId: string,
  userMessage: string
): Promise<{ response: string; shouldEscalate: boolean }> {
  if (checkEscalation(userMessage)) {
    clearHistory(chatId);
    return {
      response:
        "I understand you'd like to speak with a human agent. Let me connect you right away — please hold on while I find an available support agent for you.",
      shouldEscalate: true,
    };
  }

  const history = conversationHistories.get(chatId) || [];
  history.push({ role: 'user', content: userMessage });

  const client = getClient();
  let response: string;

  if (client) {
    response = await getClaudeResponse(client, history);
  } else {
    response = getBuiltInResponse(userMessage, history);
  }

  history.push({ role: 'assistant', content: response });

  if (history.length > 20) {
    history.splice(0, history.length - 20);
  }
  conversationHistories.set(chatId, history);

  return { response, shouldEscalate: false };
}

async function getClaudeResponse(
  client: Anthropic,
  history: ConversationMessage[]
): Promise<string> {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    return textBlock ? textBlock.text : "I'm sorry, I couldn't process that. Could you rephrase your question?";
  } catch (error) {
    console.error('Claude API error, falling back to built-in:', error);
    return getBuiltInResponse(
      history[history.length - 1]?.content || '',
      history
    );
  }
}

function getBuiltInResponse(
  message: string,
  history: ConversationMessage[]
): string {
  const lower = message.toLowerCase();
  const isFirstMessage = history.filter((m) => m.role === 'user').length <= 1;

  if (isFirstMessage && isGreeting(lower)) {
    return "Hello! Welcome to Zomato Support. I'm Zomi, your AI assistant. I can help you with order tracking, refunds, delivery issues, payments, and more. How can I assist you today?";
  }

  if (isGreeting(lower)) {
    return "Hi there! How can I help you?";
  }

  if (lower.includes('thank') || lower.includes('thanks') || lower.includes('appreciated')) {
    return "You're welcome! Is there anything else I can help you with? If not, feel free to close the chat. Have a great day!";
  }

  if (lower.includes('bye') || lower.includes('goodbye') || lower.includes('that\'s all')) {
    return "Thank you for reaching out to Zomato Support! If you need help in the future, don't hesitate to start a new chat. Have a wonderful day!";
  }

  // Order-related
  if (matchesAny(lower, ['order status', 'track order', 'where is my order', 'order tracking', 'my order', 'order late', 'when will my order'])) {
    return "I'd be happy to help you track your order! Could you please share your order number? You can find it in the \"My Orders\" section of the app. Once I have that, I can look into the current status for you.";
  }

  if (matchesAny(lower, ['wrong order', 'incorrect order', 'not what i ordered', 'wrong item', 'wrong food'])) {
    return "I'm really sorry to hear you received the wrong order — that's certainly frustrating. To help resolve this quickly, could you share your order number and let me know what was incorrect? In the meantime, you can also report this directly from the order details page for an immediate resolution. If you'd prefer a human agent to handle this, just type \"connect to an agent\".";
  }

  if (matchesAny(lower, ['missing item', 'item missing', 'incomplete order', 'not complete', 'items missing'])) {
    return "I apologize for the missing items in your order. Please share your order number and the items that were missing. You can also report missing items directly from the order details in the app, which can trigger an instant partial refund. Would you like me to guide you through that process?";
  }

  // Refund-related
  if (matchesAny(lower, ['refund', 'money back', 'get my money', 'refund status', 'when will i get refund'])) {
    return "I understand you'd like help with a refund. Refunds are typically processed within 5-7 business days back to your original payment method. Could you share your order number so I can check the status? If a refund hasn't been initiated yet, I can help you request one.";
  }

  if (matchesAny(lower, ['cancel order', 'cancel my order', 'cancellation', 'want to cancel'])) {
    return "I can help with order cancellation. If your order hasn't been prepared yet, you can cancel it directly from the order details page in the app. Please note that cancellation charges may apply if the restaurant has already started preparing your food. Would you like to share your order number so I can check the current status?";
  }

  // Delivery-related
  if (matchesAny(lower, ['late delivery', 'delivery delayed', 'taking too long', 'delivery time', 'still waiting', 'not delivered'])) {
    return "I'm sorry about the delay with your delivery. Delivery times can sometimes be affected by high demand, traffic, or restaurant preparation times. Could you share your order number? I can check the real-time status of your delivery. If it's significantly delayed, you may be eligible for Zomato credits or a partial refund.";
  }

  if (matchesAny(lower, ['delivery partner', 'delivery boy', 'driver', 'delivery person', 'rider'])) {
    return "If you're having an issue with your delivery partner, I'm sorry about that experience. You can rate and provide feedback on the delivery after your order is complete. For urgent issues (like the delivery partner being unable to find your location), you can contact them directly through the app's call button. Can you tell me more about the specific issue?";
  }

  // Payment-related
  if (matchesAny(lower, ['payment failed', 'payment issue', 'payment problem', 'can\'t pay', 'payment not going through'])) {
    return "I'm sorry you're having trouble with your payment. Here are a few things to try: 1) Check if your card/UPI has sufficient balance, 2) Try a different payment method, 3) Clear the app cache and retry. If the amount was debited but the order wasn't placed, the refund will be auto-initiated within 24-48 hours. Would you like more specific help?";
  }

  if (matchesAny(lower, ['charged twice', 'double charge', 'extra charge', 'overcharged', 'wrong amount'])) {
    return "I understand the concern about being charged incorrectly — let me help sort this out. Please share your order number and the exact amount you were charged. If there was a duplicate charge, it's usually reversed automatically within 3-5 business days. If not, I can escalate this for a manual review. You can also type \"connect to an agent\" for immediate human assistance.";
  }

  // Restaurant/Food quality
  if (matchesAny(lower, ['food quality', 'bad food', 'cold food', 'stale', 'taste', 'hygiene', 'food safety'])) {
    return "I'm sorry to hear about the food quality issue. Your feedback is important and helps us maintain restaurant standards on Zomato. Could you share your order number? You can also leave a detailed review on the restaurant page. For serious food safety concerns, I'd recommend connecting with a human agent who can take immediate action — just type \"connect to an agent\".";
  }

  // Account issues
  if (matchesAny(lower, ['account', 'login', 'password', 'email', 'phone number', 'profile', 'update my'])) {
    return "For account-related changes, you can update most details directly in the app under Profile > Settings. If you're having trouble logging in, try the \"Forgot Password\" option. For phone number or email changes that require verification, you might need additional support. Would you like me to guide you through a specific account update?";
  }

  // Promotions/Coupons
  if (matchesAny(lower, ['coupon', 'promo', 'discount', 'offer', 'code not working', 'promotion', 'deal'])) {
    return "I can help with promotions and coupons! If a code isn't working, it could be due to: 1) The code has expired, 2) Minimum order value not met, 3) The code is for specific restaurants/items, or 4) It may have already been used. Check the \"Offers\" section in the app for currently active promotions. What specific issue are you facing?";
  }

  // Catch-all
  if (isFirstMessage) {
    return "Hello! Welcome to Zomato Support. I'm Zomi, your AI assistant. I can help with order tracking, refunds, delivery issues, payments, and more. Could you tell me what you need help with today?";
  }

  return "I want to make sure I help you correctly. Could you provide a bit more detail about your issue? I can assist with order tracking, refunds, delivery problems, payment issues, and more. If you'd prefer to speak with a human agent, just type \"connect to an agent\" and I'll transfer you right away.";
}

function isGreeting(text: string): boolean {
  return matchesAny(text, ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'howdy', 'greetings', 'sup', 'what\'s up']);
}

function matchesAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}

export function clearHistory(chatId: string): void {
  conversationHistories.delete(chatId);
}

export function getWelcomeMessage(): string {
  return "Hello! I'm Zomi, your Zomato AI support assistant. I can help you with order tracking, refunds, delivery issues, payment problems, and more. How can I assist you today?\n\nIf at any point you'd like to speak with a human agent, just type **\"connect to an agent\"**.";
}
