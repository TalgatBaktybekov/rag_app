// components/chat/InputBox.jsx
import React, { useState } from "react";
import { Button } from "../ui/button.jsx";
import { Textarea } from "../ui/textarea.jsx";
import { Send, Loader2 } from "lucide-react";
import "../../theme.css";

const InputBox = ({ onSendMessage, isLoading = false }) => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    onSendMessage(message.trim());
    setMessage("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="px-6 pb-6 pt-4 border-t border-white/10 bg-gradient-to-t from-white/5 to-transparent">
      <form
        onSubmit={handleSubmit}
        className="flex gap-3 items-end max-w-4xl mx-auto"
      >
        <div className="flex-1 relative">
          <Textarea
            placeholder="Ask a question about your documents..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="chat-input"
            disabled={isLoading}
            data-testid="chat-input"
            data-chat-input="true"
            style={{
              minHeight: '60px',
              background: 'rgba(255,255,255,0.08)',
              backgroundColor: 'rgba(255,255,255,0.08)',
              color: 'rgba(248, 250, 252, 0.95)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '1.5rem',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              padding: '1rem 1.25rem',
              fontSize: '1rem',
              lineHeight: '1.6',
              resize: 'none',
              width: '100%',
              transition: 'all 0.3s ease',
              boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.1)',
              outline: 'none'
            }}
          />
        </div>
        <button
          type="submit"
          className="glass-button p-4 rounded-2xl shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed interactive"
          disabled={!message.trim() || isLoading}
          style={{
            minHeight: '60px',
            minWidth: '60px'
          }}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </form>
      <div className="text-xs text-white/40 text-center mt-4 px-4">
        <span className="inline-flex items-center gap-2">
          AI responses are generated based on your uploaded documentation. 
        </span>
      </div>
    </div>
  );
};

export default InputBox;
