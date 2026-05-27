import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/auth";

// In-memory rate limiting store: key is client IP, value is array of request timestamps
const rateLimitStore = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 30000; // 30 seconds
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 requests per window

export async function POST(req: Request) {
  let parsedMessages: any[] = [];
  let sessionId = "unknown-session";
  
  // Resolve client IP
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

  // Enforce sliding window rate limit
  const now = Date.now();
  const userRequests = rateLimitStore.get(ip) || [];
  const activeRequests = userRequests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS);
  
  if (activeRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return NextResponse.json({
      choices: [
        {
          message: {
            role: "assistant",
            content: "Whoa, slow down there. 😐 You're talking way too fast for my circuits. Let's take a 30-second breather. 🗿"
          }
        }
      ]
    }, { status: 429 });
  }

  // Record current request timestamp
  activeRequests.push(now);
  rateLimitStore.set(ip, activeRequests);

  try {
    const body = await req.json();
    const { messages, sessionId: bodySessionId } = body;
    parsedMessages = messages;
    if (bodySessionId) {
      sessionId = bodySessionId;
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid request. 'messages' array is required." },
        { status: 400 }
      );
    }

    // Propose suspicious use character limit: max 2000 characters per message
    const hasExcessiveMessage = messages.some((msg: any) => msg.content && msg.content.length > 2000);
    if (hasExcessiveMessage) {
      return NextResponse.json({
        choices: [
          {
            message: {
              role: "assistant",
              content: "Wait a minute. 😐 This message is suspiciously long (exceeds 2000 characters). Please send a shorter message. 🗿"
            }
          }
        ]
      }, { status: 400 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    // If Gemini API Key is missing, guide the developer/user gracefully rather than crashing.
    if (!geminiApiKey) {
      console.warn("Google Gemini API key (GEMINI_API_KEY) is not set in environment variables.");
      return NextResponse.json({
        choices: [
          {
            message: {
              role: "assistant",
              content: "👋 Hello! I am the VPortal Assistant. To enable my AI-powered capabilities, please set the `GEMINI_API_KEY` environment variable in your `.env.local` file with your Google Gemini API key."
            }
          }
        ]
      });
    }

    // Inject system context to guide the assistant
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

    // Map chat messages to Gemini contents structure (filtering for user/assistant roles)
    const contents = messages
      .filter((msg: any) => msg.role === "user" || msg.role === "assistant")
      .map((msg: any) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      }));

    // Call Google Gemini API (defaulting to gemini-2.5-flash)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: contents,
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
          }
        }),
        // Add a timeout to prevent hanging forever
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
      if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
      }
      replyContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    // Record the conversation log to Firestore
    const currentUser = await getCurrentUser();
    if (adminDb) {
      try {
        const userId = currentUser ? currentUser.uid : "guest";
        const userEmail = currentUser ? currentUser.email || "guest@vportal.internal" : "guest@vportal.internal";
        const userDisplayName = currentUser ? currentUser.name || "Guest User" : "Guest User";

        await adminDb.collection("chats").doc(sessionId).set({
          sessionId,
          userId,
          userEmail,
          userDisplayName,
          messages: parsedMessages.concat([{ role: "assistant", content: replyContent }]),
          lastMessageAt: new Date().toISOString(),
          ipAddress: ip,
        }, { merge: true });
      } catch (dbError) {
        console.error("Failed to write chat log to Firestore:", dbError);
      }
    }

    // Map back to format expected by ChatWidget frontend
    return NextResponse.json({
      choices: [
        {
          message: {
            role: "assistant",
            content: replyContent
          }
        }
      ]
    });
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    let errorMessage = error instanceof Error ? error.message : String(error);
    
    // Attempt to extract the deep cause of the fetch failure
    if (error instanceof Error && (error as any).cause) {
      const cause = (error as any).cause;
      errorMessage += ` | Cause: ${cause.message || cause.code || String(cause)}`;
    }
    
    console.warn("Gemini API call failed, using fallback responder:", errorMessage);
    const fallbackResponse = getLocalFallbackResponse(parsedMessages);

    // Record fallback chat to Firestore
    const currentUser = await getCurrentUser();
    if (adminDb) {
      try {
        const userId = currentUser ? currentUser.uid : "guest";
        const userEmail = currentUser ? currentUser.email || "guest@vportal.internal" : "guest@vportal.internal";
        const userDisplayName = currentUser ? currentUser.name || "Guest User" : "Guest User";

        await adminDb.collection("chats").doc(sessionId).set({
          sessionId,
          userId,
          userEmail,
          userDisplayName,
          messages: parsedMessages.concat([{ role: "assistant", content: fallbackResponse }]),
          lastMessageAt: new Date().toISOString(),
          ipAddress: ip,
        }, { merge: true });
      } catch (dbError) {
        console.error("Failed to write fallback chat log to Firestore:", dbError);
      }
    }

    return NextResponse.json({
      choices: [
        {
          message: {
            role: "assistant",
            content: fallbackResponse
          }
        }
      ]
    });
  }
}

function getLocalFallbackResponse(messages: { role: string; content: string }[]): string {
  const userMessages = messages.filter(m => m.role === "user");
  const lastUserMessage = userMessages[userMessages.length - 1]?.content || "";
  const query = lastUserMessage.toLowerCase();
  
  if (query.includes("what is vportal") || query.includes("vportal")) {
    return "VPortal is a centralized company dashboard for organizing apps, mastermind-designed by the legend Mr. David SIN. 😐 Search, filter, and save apps. 🗿";
  }
  if (query.includes("sign in") || query.includes("log in") || query.includes("login") || query.includes("signup") || query.includes("guest")) {
    return "Sign up with password, sign in with Google, or click 'Continue as Guest' to view the public applications. 😐 Pretty simple. 🗿";
  }
  if (query.includes("apps") || query.includes("categories") || query.includes("hosted")) {
    return "VPortal hosts apps like Jira, Slack, and GitHub. Admins manage them. 😐 What else do you need? 🗿";
  }
  return "👋 VPortal Assistant here in offline mode. 😐 GEMINI_API_KEY is not responding, but I'm keeping a straight face. 🗿";
}

