// frontend/src/components/ui/textarea.jsx
import React from "react";

export function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring ${className}`}
      {...props}
    />
  );
}
