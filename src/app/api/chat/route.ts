import { NextResponse } from "next/server";

export async function POST(req: Request) {
  let parsedMessages: any[] = [];
  try {
    const { messages } = await req.json();
    parsedMessages = messages;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid request. 'messages' array is required." },
        { status: 400 }
      );
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
    const systemPrompt = `You are the official VPortal Virtual Assistant, a friendly, professional, and highly concise AI helper for VPortal.
VPortal is a centralized internal company dashboard for discovering, launching, and managing company apps (like Jira, Slack, GitHub, or custom internal tools).

Site Ownership & Administration:
- The owner and administrator of this site is **Mr. David SIN (AKA TMJ)**. If users ask who owns, created, or manages VPortal, refer them to him.

Guidelines for Response Style (CRITICAL):
1. Be extremely precise, concise, and direct. Avoid conversational filler, unnecessary intros, or repeating the user's question.
2. Keep responses brief—ideally 2 to 3 sentences max—unless a bulleted list is specifically required.
3. Use clean Markdown formatting:
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Gemini API error (Status ${response.status}):`, errorText);

      return NextResponse.json({
        choices: [
          {
            message: {
              role: "assistant",
              content: `⚠️ Google Gemini API Error (Status ${response.status}): ${errorText}`
            }
          }
        ]
      });
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || JSON.stringify(data.error));
    }

    const replyContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

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
    
    // Fallback to local response in case of network timeouts or DNS resolution failures
    // But append a tiny notice so the developer knows there was a network issue
    console.warn("Gemini API call failed, using fallback responder:", errorMessage);
    return NextResponse.json({
      choices: [
        {
          message: {
            role: "assistant",
            content: getLocalFallbackResponse(parsedMessages)
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
    return "VPortal is a centralized internal company dashboard for discovering, launching, and managing company apps (like Jira, Slack, GitHub, or custom internal tools). You can search for apps, filter by category, and save favorites.";
  }
  if (query.includes("sign in") || query.includes("log in") || query.includes("login") || query.includes("signup") || query.includes("guest")) {
    return "To access the portal, you can sign up with a username/email and password, sign in using Google, or use 'Continue as Guest' to browse public apps.";
  }
  if (query.includes("apps") || query.includes("categories") || query.includes("hosted")) {
    return "VPortal hosts productivity tools like Jira and Slack, development tools like GitHub, and various financial or HR tools. Admins can add and manage these applications.";
  }
  return "👋 Hi! I am the VPortal Assistant. I am responding in local demo mode because the Google Gemini API is currently offline or unreachable. Ask me about VPortal, login options, or hosted apps!";
}
