// frontend/src/components/ui/textarea.jsx
import React from "react";

export function Textarea({ className = "", style = {}, ...props }) {
  return (
    <textarea
      className={className}
      style={style}
      {...props}
    />
  );
}
