"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  content: string;
  timestamp: string;
  senderType: "user" | "ai" | "admin";
  senderName?: string;
  senderAvatar?: string;
}

export function ChatBubble({
  content,
  timestamp,
  senderType,
  senderName,
  senderAvatar,
}: ChatBubbleProps) {
  const isUser = senderType === "user";
  const formattedTime = new Date(timestamp).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={cn("flex gap-3 max-w-full", isUser ? "justify-start" : "justify-end")}>
      {isUser && (
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          <AvatarImage src={senderAvatar} alt={senderName} />
          <AvatarFallback>{senderName?.slice(0, 1) || "U"}</AvatarFallback>
        </Avatar>
      )}

      <div className={cn("flex flex-col", isUser ? "items-start" : "items-end")}>
        {senderType !== "user" && (
          <span className="mb-1 text-xs text-muted-foreground">
            {senderType === "ai" ? "AI" : "管理者"}
          </span>
        )}
        <div
          className={cn(
            "max-w-sm rounded-2xl px-4 py-2.5 text-sm",
            isUser
              ? "bg-muted text-foreground"
              : senderType === "ai"
              ? "bg-primary text-primary-foreground"
              : "bg-blue-600 text-white"
          )}
        >
          <p className="whitespace-pre-wrap break-words">{content}</p>
        </div>
        <span className="mt-1 text-xs text-muted-foreground">{formattedTime}</span>
      </div>

      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          <AvatarFallback
            className={cn(
              senderType === "ai" ? "bg-primary/20 text-primary" : "bg-blue-100 text-blue-700"
            )}
          >
            {senderType === "ai" ? <Bot className="h-4 w-4" /> : "AD"}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
