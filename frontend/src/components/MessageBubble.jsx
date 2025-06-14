import React, { useEffect, useRef } from "react";

function formatTimestamp(ts) {
  const date = new Date(ts);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.opacity = 0;
      ref.current.style.transform = isUser ? "translateX(20px)" : "translateX(-20px)";
      setTimeout(() => {
        if (ref.current) {
          ref.current.style.transition = "opacity 0.3s ease, transform 0.3s ease";
          ref.current.style.opacity = 1;
          ref.current.style.transform = "translateX(0)";
        }
      }, 10);
    }
  }, [message, isUser]);

  return (
    <div
      ref={ref}
      className={`max-w-xs p-3 rounded-lg mb-2 break-words shadow-sm flex items-end gap-2 ${
        isUser
          ? "bg-blue-600 text-white self-end rounded-br-none"
          : "bg-gray-100 text-gray-900 self-start rounded-bl-none"
      }`}
      style={{ alignSelf: isUser ? "flex-end" : "flex-start" }}
    >
      {!isUser && (
        <div
          aria-label="AI"
          className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-400 text-white text-xs font-bold flex items-center justify-center select-none"
          title="AI"
        >
          AI
        </div>
      )}
      <div>
        <div>{message.content}</div>
        <div className="text-xs mt-1 text-gray-400 text-right select-none">
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
    </div>
  );
}