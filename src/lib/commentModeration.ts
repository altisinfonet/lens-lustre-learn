// Client-side comment moderation: profanity filter, URL detection, spam patterns

const PROFANITY_LIST = [
  "fuck", "shit", "ass", "bitch", "damn", "dick", "cock", "pussy", "bastard",
  "whore", "slut", "cunt", "fag", "nigger", "retard", "rape",
  "motherfucker", "asshole", "bullshit", "goddamn", "piss",
  // Common obfuscations
  "f u c k", "s h i t", "b i t c h", "f*ck", "sh*t", "b*tch", "a$$",
  "fck", "fuk", "stfu", "wtf", "lmfao",
];

const URL_PATTERN = /(?:https?:\/\/|www\.|[a-z0-9-]+\.(com|org|net|io|co|me|info|biz|xyz|online|site|top|click|link|gq|ml|cf|ga|tk))/i;

const SPAM_PATTERNS = [
  /buy\s+now/i,
  /click\s+here/i,
  /free\s+(money|gift|card|iphone|bitcoin|crypto)/i,
  /earn\s+\$?\d+/i,
  /make\s+money/i,
  /limited\s+time\s+offer/i,
  /act\s+now/i,
  /congratulations.*won/i,
  /100%\s+free/i,
  /dm\s+me/i,
  /follow\s+me\s+@/i,
  /check\s+(my|out)\s+(bio|profile|link)/i,
  /whatsapp/i,
  /telegram/i,
];

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
  flagType?: "profanity" | "url" | "spam";
}

export function moderateComment(text: string): ModerationResult {
  const lower = text.toLowerCase().trim();

  if (!lower || lower.length < 1) {
    return { allowed: false, reason: "Comment cannot be empty" };
  }

  if (lower.length > 2000) {
    return { allowed: false, reason: "Comment is too long (max 2000 characters)" };
  }

  // Check profanity
  for (const word of PROFANITY_LIST) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(lower)) {
      return { allowed: false, reason: "Comment contains inappropriate language", flagType: "profanity" };
    }
  }

  // Check URLs
  if (URL_PATTERN.test(text)) {
    return { allowed: false, reason: "URLs are not allowed in comments", flagType: "url" };
  }

  // Check spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      return { allowed: false, reason: "Comment detected as spam", flagType: "spam" };
    }
  }

  // Excessive caps (more than 70% uppercase in messages > 10 chars)
  if (lower.length > 10) {
    const upperCount = (text.match(/[A-Z]/g) || []).length;
    const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
    if (letterCount > 0 && upperCount / letterCount > 0.7) {
      return { allowed: false, reason: "Please avoid excessive use of capital letters", flagType: "spam" };
    }
  }

  // Repetitive characters (e.g. "aaaaaaa")
  if (/(.)\1{5,}/i.test(text)) {
    return { allowed: false, reason: "Comment contains repetitive characters", flagType: "spam" };
  }

  return { allowed: true };
}
