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

    const hfToken = process.env.HF_TOKEN || process.env.NEXT_PUBLIC_HF_TOKEN;
    const hfModel = process.env.HF_MODEL || "meta-llama/Llama-3.3-70B-Instruct";

    // If HF Token is missing, guide the developer/user gracefully rather than crashing.
    if (!hfToken) {
      console.warn("Hugging Face API token (HF_TOKEN) is not set in environment variables.");
      return NextResponse.json({
        choices: [
          {
            message: {
              role: "assistant",
              content: "👋 Hello! I am the VPortal Assistant. To enable my AI-powered capabilities, please set the `HF_TOKEN` environment variable in your `.env.local` file with your Hugging Face API key."
            }
          }
        ]
      });
    }

    // Inject system context to guide the assistant
    const systemPrompt = {
      role: "system",
      content: `You are the official VPortal Virtual Assistant, a friendly and helpful AI helper for VPortal.
VPortal is a centralized internal company dashboard for discovering, launching, and managing company apps (like Jira, Slack, GitHub, or custom internal tools).

Guidelines:
1. Be polite, concise, and helpful.
2. Help guests understand how to use the portal.
3. If they ask about login or accessing the dashboard, explain that they can:
   - Sign up with a username/email and password.
   - Use Google Sign-in.
   - Use "Continue as Guest" to view public applications.
4. If they ask about features, mention:
   - Search & filters to locate tools by category or tags.
   - Favoriting apps (click the heart icon) for quick access.
   - Admin features for managing apps and categories (for users with Admin rights).
5. Avoid answering questions completely unrelated to technology, business, or the portal if possible, or gently guide them back to VPortal.
6. Keep your answers formatting clean (use bullet points and bold text where appropriate).`
    };

    // Format messages list (ensuring system prompt is first)
    const formattedMessages = [systemPrompt, ...messages];

    // Call Hugging Face Inference API
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${hfModel}/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: hfModel,
          messages: formattedMessages,
          max_tokens: 800,
          temperature: 0.7,
        }),
        // Add a timeout to prevent hanging forever
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Hugging Face API error (Status ${response.status}):`, errorText);

      // Handle loading/503 state gracefully
      if (response.status === 503) {
        return NextResponse.json({
          choices: [
            {
              message: {
                role: "assistant",
                content: "💤 The Hugging Face model is currently loading or warming up. Please try sending your message again in a few seconds."
              }
            }
          ]
        });
      }

      // Return the exact error to the chat widget so we can see what is failing on Vercel
      return NextResponse.json({
        choices: [
          {
            message: {
              role: "assistant",
              content: `⚠️ Hugging Face API Error (Status ${response.status}): ${errorText}`
            }
          }
        ]
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    
    // Fallback to local response in case of network timeouts or DNS resolution failures
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
  return "👋 Hi! I am the VPortal Assistant. I am responding in local demo mode because the Hugging Face API is currently offline or unreachable. Ask me about VPortal, login options, or hosted apps!";
}
