"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <main className="flex flex-col max-w-xl mx-auto py-8 gap-4">
      <div className="border rounded p-3 h-96 overflow-y-auto text-sm space-y-2">
        {messages.map((m) => (
          <div key={m.id}>
            <b>{m.role === "user" ? "You" : "AI"}:</b>{" "}
            {m.parts.map((part, i) =>
              part.type === "text" ? (
                <span key={i}>{part.text}</span>
              ) : null
            )}
          </div>
        ))}
        {isLoading && <div>AI soch raha hai...</div>}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="flex-1 border rounded px-2 py-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Kuch bhi pucho, English mein..."
        />
        <button type="submit" className="border rounded px-3 py-1" disabled={isLoading}>
          Send
        </button>
      </form>
    </main>
  );
}
