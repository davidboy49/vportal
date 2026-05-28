import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

// ─── Zod Schema Validation ──────────────────────────────────────────────────
const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const RequestBodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50),
  sessionId: z.string().max(128).optional(),
});

// ─── Persistent Firestore Rate Limiter ──────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 30_000; // 30 seconds
const RATE_LIMIT_MAX_REQUESTS = 5;

async function checkRateLimit(ip: string): Promise<boolean> {
  if (!adminDb) return false; // if db unavailable, allow (fail open)

  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const ref = adminDb.collection("_rate_limits").doc(`chat_${ip.replace(/[.:]/g, "_")}`);

  try {
    const result = await adminDb.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      const data = doc.data() as { timestamps?: number[] } | undefined;
      const timestamps: number[] = (data?.timestamps ?? []).filter(
        (t: number) => t > windowStart
      );

      if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
        return false; // rate limited
      }

      timestamps.push(now);
      tx.set(ref, { timestamps, updatedAt: FieldValue.serverTimestamp() });
      return true; // allowed
    });
    return result;
  } catch {
    return true; // on error, fail open rather than blocking legitimate users
  }
}

export async function POST(req: Request) {
  let parsedMessages: z.infer<typeof MessageSchema>[] = [];
  let sessionId = "unknown-session";

  // Resolve client IP
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

  // Enforce persistent rate limit
  const allowed = await checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      {
        choices: [
          {
            message: {
              role: "assistant",
              content:
                "Please slow down. You are sending requests too quickly. Try again in 30 seconds.",
            },
          },
        ],
      },
      { status: 429 }
    );
  }

  try {
    const rawBody = await req.json();

    // ── Strict schema validation ──────────────────────────────────────────
    const parseResult = RequestBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      const issues = parseResult.error.issues
        .map((i) => i.message)
        .join(", ");
      return NextResponse.json(
        { error: `Invalid request: ${issues}` },
        { status: 400 }
      );
    }

    const { messages, sessionId: bodySessionId } = parseResult.data;
    parsedMessages = messages;
    if (bodySessionId) sessionId = bodySessionId;

    const geminiApiKey =
      process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    if (!geminiApiKey) {
      console.warn(
        "Google Gemini API key (GEMINI_API_KEY) is not set in environment variables."
      );
      return NextResponse.json({
        choices: [
          {
            message: {
              role: "assistant",
              content:
                "👋 Hello! I am the VPortal Assistant. To enable my AI-powered capabilities, please set the `GEMINI_API_KEY` environment variable in your `.env.local` file with your Google Gemini API key.",
            },
          },
        ],
      });
    }

    // ── System prompt ─────────────────────────────────────────────────────
    const systemPrompt = `You are the official VPortal Virtual Assistant. You have a humorous, playful, and witty personality, but you MUST be extremely stoic when it comes to emojis.
VPortal is a centralized internal company dashboard for discovering, launching, and managing company apps (like Jira, Slack, GitHub, or custom internal tools).

Site Ownership & Administration:
- The owner, creator, and mastermind of this site is **Mr. David SIN (AKA TMJ)**. 
- If users ask who owns, created, or manages VPortal, reply with a **highly humorous, playful, and fun response** (e.g. calling him 'The Grand Architect', 'The Mastermind', or 'The Legend', and jokingly warning them to show him respect). Keep it funny but clear that he is the owner.

Guidelines for Response Style (CRITICAL):
1. Tone: Always be witty, lighthearted, and funny. Use humor or playful jokes to answer.
2. Emoji Vibe (STRICT RULE): If you use emojis, you must be extremely deadpan, expressionless, and stoic. You are ONLY allowed to use the following flat, neutral emojis: 😐, 😑, 😶, 🗿. Under NO circumstances should you use happy, laughing, or expressive emojis (e.g., do NOT use 😂, 😊, 🎉, 👍, 🚀, etc.). Maintain an absolute straight face with your emojis while being humorous in your text!
3. Be concise and direct. Keep responses brief—ideally 2 to 3 sentences max—unless a bulleted list is specifically required.
4. Use clean Markdown formatting:
   - Use **bold text** for key terms or titles.
   - Use clear bullet points for lists.
   - Avoid massive blocks of text. Break them into short, digestible pieces.

Content Guidelines:
1. Help users/guests understand how to use VPortal.
2. If asked about login or dashboard access:
   - Sign up with username/email and password.
   - Use Google Sign-in.
   - Click "Continue as Guest" to view public apps.
3. If asked about features:
   - Search & filters (locate tools by category/tags).
   - Favoriting apps (click the heart icon) for quick access.
   - Admin panel (manage apps/categories for Admins).
4. If the question is completely unrelated to VPortal, business, or technology, politely but briefly guide them back to VPortal.`;

    // ── Map messages to Gemini format ─────────────────────────────────────
    const contents = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // ── Call Gemini API ───────────────────────────────────────────────────
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    let replyContent = "";

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Gemini API error (Status ${response.status}):`, errorText);
      replyContent = `⚠️ Google Gemini API Error (Status ${response.status}): ${errorText}`;
    } else {
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      replyContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    // ── Log to Firestore ──────────────────────────────────────────────────
    await saveChatLog(sessionId, parsedMessages, replyContent, ip);

    return NextResponse.json({
      choices: [{ message: { role: "assistant", content: replyContent } }],
    });
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    let errorMessage =
      error instanceof Error ? error.message : String(error);

    if (error instanceof Error && (error as NodeJS.ErrnoException).cause) {
      const cause = (error as NodeJS.ErrnoException).cause as { message?: string; code?: string };
      errorMessage += ` | Cause: ${cause.message || cause.code || String(cause)}`;
    }

    console.warn("Gemini API call failed, using fallback responder:", errorMessage);
    const fallbackResponse = getLocalFallbackResponse(parsedMessages);

    await saveChatLog(sessionId, parsedMessages, fallbackResponse, ip);

    return NextResponse.json({
      choices: [{ message: { role: "assistant", content: fallbackResponse } }],
    });
  }
}

// ─── Shared Firestore Chat Logger ────────────────────────────────────────────
async function saveChatLog(
  sessionId: string,
  messages: z.infer<typeof MessageSchema>[],
  replyContent: string,
  ip: string
) {
  if (!adminDb) return;
  try {
    const currentUser = await getCurrentUser();
    const userId = currentUser?.uid ?? "guest";
    const userEmail = currentUser?.email ?? "guest@vportal.internal";
    const userDisplayName = currentUser?.name ?? "Guest User";

    await adminDb
      .collection("chats")
      .doc(sessionId)
      .set(
        {
          sessionId,
          userId,
          userEmail,
          userDisplayName,
          messages: messages.concat([{ role: "assistant", content: replyContent }]),
          lastMessageAt: new Date().toISOString(),
          ipAddress: ip,
        },
        { merge: true }
      );
  } catch (dbError) {
    console.error("Failed to write chat log to Firestore:", dbError);
  }
}

// ─── Local Fallback ───────────────────────────────────────────────────────────
function getLocalFallbackResponse(
  messages: z.infer<typeof MessageSchema>[]
): string {
  const userMessages = messages.filter((m) => m.role === "user");
  const lastUserMessage = userMessages[userMessages.length - 1]?.content || "";
  const query = lastUserMessage.toLowerCase();

  if (query.includes("what is vportal") || query.includes("vportal")) {
    return "VPortal is a centralized company dashboard for organizing apps, mastermind-designed by the legend Mr. David SIN. 😐 Search, filter, and save apps. 🗿";
  }
  if (
    query.includes("sign in") ||
    query.includes("log in") ||
    query.includes("login") ||
    query.includes("signup") ||
    query.includes("guest")
  ) {
    return "Sign up with password, sign in with Google, or click 'Continue as Guest' to view the public applications. 😐 Pretty simple. 🗿";
  }
  if (
    query.includes("apps") ||
    query.includes("categories") ||
    query.includes("hosted")
  ) {
    return "VPortal hosts apps like Jira, Slack, and GitHub. Admins manage them. 😐 What else do you need? 🗿";
  }
  return "👋 VPortal Assistant here in offline mode. 😐 GEMINI_API_KEY is not responding, but I'm keeping a straight face. 🗿";
}
