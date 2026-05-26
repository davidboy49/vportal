"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Sparkles, RefreshCw, Bot, AlertTriangle } from "lucide-react";

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

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasPromptedSetup, setHasPromptedSetup] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load messages from sessionStorage on client load
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("vportal_chat_history");
      if (stored) {
        setMessages(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load chat history", e);
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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const replyContent = data.choices?.[0]?.message?.content;
      if (replyContent) {
        // If it's a notification about missing HF_TOKEN, flag it
        if (replyContent.includes("HF_TOKEN")) {
          setHasPromptedSetup(true);
        }
        setMessages((prev) => [...prev, { role: "assistant", content: replyContent }]);
      } else {
        throw new Error("Invalid response format from server");
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "❌ Sorry, I encountered an error connection issue. Please make sure the backend is fully running and environment variables are configured.",
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

  const handleClearChat = () => {
    if (confirm("Are you sure you want to clear your chat history?")) {
      setMessages([]);
      sessionStorage.removeItem("vportal_chat_history");
      setHasPromptedSetup(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans" ref={chatContainerRef}>
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 flex h-[500px] w-[360px] flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/80 shadow-2xl backdrop-blur-xl transition-all duration-300 dark:border-zinc-800/40 dark:bg-zinc-950/80 sm:w-[400px]">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 px-4 py-3.5 text-white">
            <div className="flex items-center space-x-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <Bot className="h-5 w-5 text-white animate-pulse" />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-indigo-600 bg-emerald-400"></span>
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-tight">VPortal Assistant</h3>
                <p className="text-[10px] text-white/80">Powered by Hugging Face AI</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  title="Clear chat"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                title="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col justify-center space-y-5 text-center px-2 py-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 dark:bg-zinc-900/60">
                  <Sparkles className="h-7 w-7 text-indigo-500 dark:text-indigo-400" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-medium text-zinc-800 dark:text-zinc-200">How can I help you today?</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[280px] mx-auto">
                    Ask me anything about VPortal, app discoveries, login instructions, or account features.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {PRESET_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="rounded-xl border border-zinc-200/60 bg-zinc-50/50 p-2.5 text-left text-xs text-zinc-600 transition-all hover:bg-indigo-50/40 hover:border-indigo-200 hover:text-indigo-600 dark:border-zinc-800/40 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200"
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
                      <div className={`flex max-w-[85%] items-start space-x-2 ${isUser ? "flex-row-reverse space-x-reverse" : "flex-row"}`}>
                        {!isUser && (
                          <div className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-indigo-500 dark:text-indigo-400 text-xs">
                            🤖
                          </div>
                        )}
                        <div
                          className={`rounded-2xl px-3.5 py-2.5 text-xs shadow-sm leading-relaxed ${
                            isUser
                              ? "bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-medium rounded-tr-none"
                              : "bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-tl-none border border-zinc-200/50 dark:border-zinc-800/30"
                          }`}
                        >
                          <div className="whitespace-pre-wrap select-text">
                            {message.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex w-full justify-start animate-in fade-in duration-200">
                    <div className="flex items-start space-x-2">
                      <div className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-indigo-500 dark:text-indigo-400 text-xs">
                        🤖
                      </div>
                      <div className="rounded-2xl rounded-tl-none bg-zinc-100 dark:bg-zinc-900 px-4 py-3 border border-zinc-200/50 dark:border-zinc-800/30">
                        <div className="flex space-x-1.5 items-center justify-center h-2">
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
            <div className="flex items-center space-x-2 bg-amber-50/80 border-t border-amber-200 px-4 py-2 text-[11px] text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span>Token required. Open <code>.env.local</code> to add <code>HF_TOKEN</code>.</span>
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
                className="flex-1 rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-3.5 py-2 text-xs outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 dark:border-zinc-800/60 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:border-indigo-400 dark:focus:bg-zinc-900 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm transition-all hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 active:scale-95 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-600 disabled:opacity-80"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FAB Button */}
      <button
        id="chat-fab-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white shadow-lg transition-transform duration-300 hover:scale-107 hover:shadow-xl active:scale-95 focus:outline-none ring-4 ring-indigo-500/10 dark:ring-indigo-400/5"
        title="Open VPortal Support Chat"
      >
        <span className="relative flex h-full w-full items-center justify-center">
          {isOpen ? (
            <X className="h-6 w-6 transform-gpu transition-all duration-300 rotate-90" />
          ) : (
            <>
              <MessageSquare className="h-6 w-6 transform-gpu transition-all duration-300 hover:rotate-6" />
              {messages.length === 0 && (
                <span className="absolute top-0.5 right-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-pink-500"></span>
                </span>
              )}
            </>
          )}
        </span>
      </button>
    </div>
  );
}
