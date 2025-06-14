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
      className="flex flex-col flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
    >
      {messages.length === 0 && (
        <p className="text-center text-gray-500 mt-20">No messages yet.</p>
      )}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}
