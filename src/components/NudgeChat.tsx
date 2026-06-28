import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext.js";
import { MessageSquare, X, Send, Sparkles, RefreshCw, Trash2 } from "lucide-react";
import { NudgeIcon } from "./NudgeIcon";

export const NudgeChat: React.FC = () => {
  const { chatMessages, sendNudgeMessage, loadingChat, clearChat } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loadingChat) return;
    
    const messageToSend = input;
    setInput("");
    await sendNudgeMessage(messageToSend);
  };

  const handleQuickPrompt = async (prompt: string) => {
    if (loadingChat) return;
    await sendNudgeMessage(prompt);
  };

  const quickPrompts = [
    { text: "What should I do next?", label: "🎯 What to do next?" },
    { text: "I can't work today, help me adjust.", label: "📅 I can't work today" },
    { text: "Can I postpone high risk tasks?", label: "⚠️ Can I postpone?" },
  ];

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 md:w-auto md:px-5 items-center justify-center md:justify-start gap-2.5 rounded-full bg-[#75162D] text-[#F5EFE6] border border-[#DCCFBE]/40 shadow-md hover:bg-[#560B18] hover:scale-[1.02] active:scale-95 transition-all duration-300 group cursor-pointer"
      >
        {isOpen ? (
          <X className="h-4.5 w-4.5" />
        ) : (
          <NudgeIcon className="h-5 w-5 text-[#E8D9C1] animate-pulse" />
        )}
        <span className="text-xs font-semibold tracking-wide hidden md:inline">{isOpen ? "Close Nudge" : "Ask Nudge"}</span>
      </button>

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="fixed bottom-22 right-4 left-4 sm:left-auto sm:right-6 z-40 flex h-[480px] max-w-md sm:w-96 flex-col rounded-[10px] border border-[#DCCFBE] bg-[#FFFDF9] shadow-lg animate-slideUp">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#DCCFBE]/30 bg-[#75162D] px-5 py-4 rounded-t-[10px] text-[#F5EFE6]">
            <div className="flex items-center gap-2.5">
              <NudgeIcon className="h-5 w-5 text-[#E8D9C1]" />
              <div>
                <h3 className="font-semibold text-sm font-sans tracking-wide">Nudge</h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={clearChat} 
                title="Clear Conversation"
                className="rounded-[6px] p-1.5 hover:bg-[#560B18] text-[#F5EFE6]/80 hover:text-white transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setIsOpen(false)} 
                className="rounded-[6px] p-1.5 hover:bg-[#560B18] text-[#F5EFE6]/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8F3EC]/40">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-[8px] px-4 py-2.5 text-xs leading-relaxed shadow-3xs ${
                    msg.role === "user"
                      ? "bg-[#75162D] text-[#F5EFE6] rounded-br-none"
                      : "bg-[#FFFDF9] text-[#2D2520] border border-[#DCCFBE]/50 rounded-bl-none"
                  }`}
                >
                  {/* Process Markdown-like bold & linebreaks */}
                  <span className="whitespace-pre-wrap block font-light">
                    {msg.text.split("\n").map((line, lIdx) => {
                      const parts = line.split("**");
                      return (
                        <span key={lIdx} className="block min-h-[4px]">
                          {parts.map((p, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="font-bold text-[#75162D]">{p}</strong> : p)}
                        </span>
                      );
                    })}
                  </span>
                </div>
              </div>
            ))}
            
            {loadingChat && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-[8px] bg-[#FFFDF9] border border-[#DCCFBE]/50 px-4 py-2.5 shadow-3xs">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#75162D]" />
                  <span className="text-[10px] text-[#6A625B] font-mono">Calibrating schedule...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Prompt Suggestions */}
          <div className="border-t border-[#DCCFBE]/30 p-2.5 bg-[#FFFDF9] flex flex-wrap gap-1.5">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                disabled={loadingChat}
                onClick={() => handleQuickPrompt(qp.text)}
                className="rounded-[6px] border border-[#DCCFBE]/50 bg-[#F8F3EC]/50 px-2.5 py-1.5 text-[10px] font-semibold text-[#6A625B] hover:bg-[#75162D]/5 hover:text-[#75162D] hover:border-[#75162D]/30 transition-all cursor-pointer"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Form Input */}
          <form onSubmit={handleSend} className="flex border-t border-[#DCCFBE]/30 p-3 bg-[#FFFDF9] rounded-b-[10px]">
            <input
              type="text"
              value={input}
              disabled={loadingChat}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask to adjust your schedule..."
              className="flex-1 rounded-[8px] border border-[#DCCFBE] px-3.5 py-2 text-xs outline-hidden focus:border-[#75162D] focus:ring-1 focus:ring-[#75162D] bg-[#FFFDF9] text-[#2D2520] placeholder-[#6A625B]/40"
            />
            <button
              type="submit"
              disabled={!input.trim() || loadingChat}
              className="ml-2 flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#75162D] text-[#F5EFE6] hover:bg-[#560B18] disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

        </div>
      )}
    </>
  );
};
