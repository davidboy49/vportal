"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Send, Sparkles, RefreshCw, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const PRESET_PROMPTS = [
  "What is VPortal?",
  "How do I sign in?",
  "What apps are hosted here?",
  "Can guest users access apps?"
];

// Helper to parse basic Markdown inline formatting (bolding, lists, and inline code)
function renderFormattedMessage(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: React.ReactNode[] = [];

  const parseInlineMarkdown = (text: string): React.ReactNode[] => {
    const parts = [];
    let currentIdx = 0;
    
    // Regexp to match **bold** or `code`
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    const matches = Array.from(text.matchAll(regex));
    
    for (const match of matches) {
      const matchText = match[0];
      const matchIndex = match.index || 0;
      
      // Add text before match
      if (matchIndex > currentIdx) {
        parts.push(text.substring(currentIdx, matchIndex));
      }
      
      if (matchText.startsWith("**") && matchText.endsWith("**")) {
        parts.push(
          <strong key={matchIndex} className="font-bold text-zinc-950 dark:text-white">
            {matchText.slice(2, -2)}
          </strong>
        );
      } else if (matchText.startsWith("`") && matchText.endsWith("`")) {
        parts.push(
          <code key={matchIndex} className="font-mono text-xs bg-zinc-200/80 dark:bg-zinc-800 px-1 py-0.5 rounded text-pink-650 dark:text-pink-400">
            {matchText.slice(1, -1)}
          </code>
        );
      }
      
      currentIdx = matchIndex + matchText.length;
    }
    
    if (currentIdx < text.length) {
      parts.push(text.substring(currentIdx));
    }
    
    return parts;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    
    // Check if line is a bullet point
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      if (!inList) {
        inList = true;
        listItems = [];
      }
      const itemContent = trimmed.substring(2);
      listItems.push(
        <li key={`li-${idx}`} className="ml-4 list-disc pl-1 mb-1 text-zinc-850 dark:text-zinc-200">
          {parseInlineMarkdown(itemContent)}
        </li>
      );
    } else {
      // If we were in a list, close it first
      if (inList) {
        elements.push(
          <ul key={`ul-${idx}`} className="space-y-0.5 my-2 list-outside">
            {listItems}
          </ul>
        );
        inList = false;
        listItems = [];
      }
      
      if (trimmed === "") {
        elements.push(<div key={`br-${idx}`} className="h-2" />);
      } else {
        elements.push(
          <p key={`p-${idx}`} className="mb-1 leading-relaxed text-zinc-800 dark:text-zinc-250">
            {parseInlineMarkdown(line)}
          </p>
        );
      }
    }
  });

  // Flush remaining list items if text ends with a list
  if (inList) {
    elements.push(
      <ul key="ul-end" className="space-y-0.5 my-2 list-outside">
        {listItems}
      </ul>
    );
  }

  return <div className="space-y-1">{elements}</div>;
}

export function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasPromptedSetup, setHasPromptedSetup] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initialize or fetch session ID and load messages
  useEffect(() => {
    try {
      let storedSess = sessionStorage.getItem("vportal_chat_session_id");
      if (!storedSess) {
        storedSess = crypto.randomUUID();
        sessionStorage.setItem("vportal_chat_session_id", storedSess);
      }
      setSessionId(storedSess);

      const storedHistory = sessionStorage.getItem("vportal_chat_history");
      if (storedHistory) {
        setMessages(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error("Failed to initialize session or load history", e);
    }
  }, []);

  // Save messages to sessionStorage when updated
  useEffect(() => {
    if (messages.length > 0) {
      try {
        sessionStorage.setItem("vportal_chat_history", JSON.stringify(messages));
      } catch (e) {
        console.error("Failed to save chat history", e);
      }
    }
  }, [messages]);

  // Scroll to bottom when messages or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isOpen]);

  // Close when clicking outside on mobile
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isOpen &&
        chatContainerRef.current &&
        !chatContainerRef.current.contains(event.target as Node)
      ) {
        // Only close if not clicking the FAB button itself
        const fab = document.getElementById("chat-fab-btn");
        if (fab && !fab.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInputValue("");
    setIsLoading(true);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (user) {
        try {
          const token = await user.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        } catch (tokenErr) {
          console.error("Failed to retrieve auth token", tokenErr);
        }
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ 
          messages: newMessages,
          sessionId: sessionId || "local-session"
        }),
      });

      // Handle rate limit (429 status code) or size errors explicitly in the dialogue bubble
      if (response.status === 429) {
        const errorData = await response.json();
        const msg = errorData?.choices?.[0]?.message?.content || "Too many requests. Please slow down. 😐";
        setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
        return;
      }

      if (!response.ok) {
        let errMsg = `API error: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData?.choices?.[0]?.message?.content) {
            errMsg = errorData.choices[0].message.content;
          } else if (errorData?.error) {
            errMsg = errorData.error;
          }
        } catch {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const replyContent = data.choices?.[0]?.message?.content;
      if (replyContent) {
        // If it's a notification about missing setup key, flag it
        if (replyContent.includes("GEMINI_API_KEY") || replyContent.includes("HF_TOKEN")) {
          setHasPromptedSetup(true);
        }
        setMessages((prev) => [...prev, { role: "assistant", content: replyContent }]);
      } else {
        throw new Error("Invalid response format from server");
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `❌ ${error.message || "Connection error. Please verify that the server is active and the GEMINI_API_KEY has been set."}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const handleConfirmClear = () => {
    setMessages([]);
    sessionStorage.removeItem("vportal_chat_history");
    try {
      const newSess = crypto.randomUUID();
      sessionStorage.setItem("vportal_chat_session_id", newSess);
      setSessionId(newSess);
    } catch (e) {
      console.error("Failed to generate new session ID", e);
    }
    setHasPromptedSetup(false);
    setShowConfirmModal(false);
  };

  return (
    <div 
      className="fixed bottom-24 right-6 z-50 font-sans select-none" 
      ref={chatContainerRef}
      style={{ fontFamily: "var(--font-outfit), var(--font-geist-sans), sans-serif" }}
    >
      {/* Chat Window */}
      {isOpen && (
        <div className="relative mb-4 flex h-[540px] w-[380px] flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/80 shadow-2xl backdrop-blur-xl transition-all duration-300 dark:border-zinc-800/40 dark:bg-zinc-950/80 sm:w-[420px] animate-in slide-in-from-bottom-5 duration-300 ease-out">
          
          {/* Custom Modern Confirm Modal */}
          {showConfirmModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="mx-4 rounded-2xl border border-zinc-200 bg-white/95 p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900/95 w-[80%] max-w-[320px] text-center space-y-4 animate-in zoom-in-95 duration-200 backdrop-blur-md">
                <div className="space-y-2">
                  <h4 className="font-bold text-base text-zinc-900 dark:text-white">Clear Chat History?</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-450 leading-relaxed">
                    This will permanently delete all messages in your current session.
                  </p>
                </div>
                <div className="flex space-x-3 justify-center pt-1">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="rounded-xl border border-zinc-250/70 px-4 py-2 text-xs font-semibold text-zinc-650 hover:bg-zinc-50/50 dark:border-zinc-750 dark:text-zinc-300 dark:hover:bg-zinc-800/50 transition-all select-none"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmClear}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-all shadow-sm active:scale-95 select-none"
                  >
                    Clear History
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between bg-blue-600 px-4 py-4 text-white dark:bg-blue-700 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                <img src="/chatbot_icon.png" alt="Bot avatar" className="h-7 w-7 object-contain rounded-full" />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-blue-600 bg-emerald-400"></span>
              </div>
              <div>
                <h3 className="font-semibold text-base leading-tight font-outfit">VPortal Assistant</h3>
                <p className="text-[11px] text-blue-100 font-medium">Powered by Google Gemini AI</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              {messages.length > 0 && (
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="rounded-lg p-1.5 text-blue-100 transition-colors hover:bg-white/10 hover:text-white"
                  title="Clear chat"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-blue-100 transition-colors hover:bg-white/10 hover:text-white"
                title="Close chat"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col justify-center space-y-5 text-center px-3 py-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 dark:bg-zinc-900/60 shadow-inner">
                  <Sparkles className="h-7 w-7 text-blue-500 dark:text-blue-400 animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-bold text-lg text-zinc-800 dark:text-zinc-100">How can I help you today?</h4>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-[320px] mx-auto leading-relaxed">
                    Ask me anything about VPortal, app discoveries, login instructions, or account features.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  {PRESET_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-3 text-left text-xs font-semibold text-zinc-650 transition-all hover:bg-blue-50/60 hover:border-blue-300 hover:text-blue-600 dark:border-zinc-850/40 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200 shadow-sm active:scale-[0.98]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, idx) => {
                  const isUser = message.role === "user";
                  return (
                    <div
                      key={idx}
                      className={`flex w-full ${isUser ? "justify-end" : "justify-start"} animate-in fade-in duration-200`}
                    >
                      <div className={`flex max-w-[88%] items-start space-x-2 ${isUser ? "flex-row-reverse space-x-reverse" : "flex-row"}`}>
                        {!isUser && (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-850 text-sm shadow-sm animate-in zoom-in-50 duration-200">
                            <img src="/chatbot_icon.png" alt="Bot avatar" className="h-5 w-5 object-contain rounded-full" />
                          </div>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-3 text-sm shadow-sm leading-relaxed ${
                            isUser
                              ? "bg-blue-600 text-white font-medium rounded-tr-none dark:bg-blue-750"
                              : "bg-zinc-100/90 dark:bg-zinc-900/90 text-zinc-850 dark:text-zinc-100 rounded-tl-none border border-zinc-200/60 dark:border-zinc-800/40"
                          }`}
                        >
                          <div className="select-text">
                            {isUser ? message.content : renderFormattedMessage(message.content)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex w-full justify-start animate-in fade-in duration-200">
                    <div className="flex items-start space-x-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-855 text-sm shadow-sm">
                        <img src="/chatbot_icon.png" alt="Bot avatar" className="h-5 w-5 object-contain rounded-full" />
                      </div>
                      <div className="rounded-2xl rounded-tl-none bg-zinc-100/90 dark:bg-zinc-900/90 px-4.5 py-3.5 border border-zinc-200/60 dark:border-zinc-800/40 shadow-sm">
                        <div className="flex space-x-1.5 items-center justify-center h-2 w-9">
                          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 dark:bg-zinc-500 [animation-delay:-0.3s]"></div>
                          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 dark:bg-zinc-500 [animation-delay:-0.15s]"></div>
                          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 dark:bg-zinc-500"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Setup Warning if token missing */}
          {hasPromptedSetup && (
            <div className="flex items-center space-x-2 bg-amber-50/80 border-t border-amber-200 px-4 py-2.5 text-xs text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
              <span>API key required. Open <code>.env.local</code> and set <code>GEMINI_API_KEY</code>.</span>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleFormSubmit} className="border-t border-zinc-200/80 dark:border-zinc-800/40 p-3 bg-white/40 dark:bg-zinc-950/40">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me something..."
                disabled={isLoading}
                className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:border-blue-400 dark:focus:bg-zinc-900 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-95 disabled:bg-zinc-250 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-650 disabled:opacity-80 shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FAB Button */}
      <button
        id="chat-fab-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform duration-300 hover:scale-107 hover:shadow-xl active:scale-95 focus:outline-none ring-4 ring-blue-500/10 dark:ring-blue-400/5 dark:bg-blue-700"
        title="Open VPortal Support Chat"
      >
        <span className="relative flex h-full w-full items-center justify-center">
          {isOpen ? (
            <X className="h-6 w-6 transform-gpu transition-all duration-300 rotate-90" />
          ) : (
            <>
              <img src="/chatbot_icon.png" alt="Chat" className="h-9 w-9 object-contain rounded-full transform-gpu transition-all duration-300 hover:rotate-6" />
              {messages.length === 0 && (
                <span className="absolute top-0.5 right-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500"></span>
                </span>
              )}
            </>
          )}
        </span>
      </button>
    </div>
  );
}
