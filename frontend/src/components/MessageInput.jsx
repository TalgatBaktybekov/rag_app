// components/MessageInput.jsx
import React, { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Send } from "lucide-react";

const MessageInput = ({ onSendMessage, isLoading = false }) => {
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
    <div className="bg-white border-t p-4 sticky bottom-0">
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 items-end max-w-4xl mx-auto"
      >
        <Textarea
          placeholder="Ask a question about the documentation..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[60px] resize-none pr-10 py-3 flex-1"
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="icon"
          className="h-10 w-10 rounded-full"
          disabled={!message.trim() || isLoading}
        >
          <Send className="h-5 w-5" />
        </Button>
      </form>
      <div className="text-xs text-gray-500 text-center mt-2">
        AI responses are generated based on the documentation knowledge base.
      </div>
    </div>
  );
};

export default MessageInput;
