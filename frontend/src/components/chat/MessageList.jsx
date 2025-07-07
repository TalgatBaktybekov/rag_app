import React, { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";

export default function MessageList({ messages = [] }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col flex-1 overflow-y-auto p-2 sm:p-4 space-y-4"
      style={{ border: "none" }}
    >
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center mx-auto mt-24 max-w-md p-8 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl shadow-lg border border-white/10 gap-4 text-center animate-fade-in">
          <div className="p-4 rounded-full bg-gradient-to-br from-blue-400/20 to-blue-600/20 border border-blue-400/30">
            <svg
              width="32"
              height="32"
              fill="none"
              viewBox="0 0 24 24"
              className="text-blue-400"
            >
              <path
                d="M12 20h.01M12 4a8 8 0 0 1 8 8c0 2.21-.896 4.21-2.343 5.657A7.978 7.978 0 0 1 12 20a7.978 7.978 0 0 1-5.657-2.343A7.978 7.978 0 0 1 4 12a8 8 0 0 1 8-8Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-white/90 mb-2">
              No messages yet
            </p>
            <p className="text-sm text-white/60 leading-relaxed">
              Start the conversation by sending a message about your documents.
            </p>
          </div>
        </div>
      )}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}
