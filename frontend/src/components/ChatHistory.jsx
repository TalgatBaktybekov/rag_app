// ChatHistory.jsx
import React, { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";

export default function ChatHistory({ messages }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 bg-white"
      style={{ maxHeight: "calc(100vh - 160px)" }}
    >
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
    </div>
  );
}
