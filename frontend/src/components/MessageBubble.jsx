import React from "react";

function formatTimestamp(ts) {
  const date = new Date(ts);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString();
}

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`max-w-xs p-3 rounded-md mb-2 ${
        isUser ? "bg-blue-600 text-white self-end" : "bg-gray-200 text-black self-start"
      }`}
      style={{ alignSelf: isUser ? "flex-end" : "flex-start" }}
    >
      <div>{message.content}</div>
      <div className="text-xs mt-1 text-gray-400 text-right">
        {formatTimestamp(message.timestamp)}
      </div>
    </div>
  );
}

