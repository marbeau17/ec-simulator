"use client";

import React, { useState } from "react";
import { Menu, Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">メニュー</span>
      </Button>

      <h1 className="text-lg font-semibold md:text-xl">{title}</h1>

      <div className="ml-auto flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="検索..."
            className="w-64 pl-8"
          />
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
            3
          </Badge>
          <span className="sr-only">通知</span>
        </Button>

        {/* User avatar dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-accent"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src="/avatars/admin.png" alt="Admin" />
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
          </button>
          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-md border bg-background p-1 shadow-lg">
                <button className="flex w-full items-center rounded-sm px-3 py-2 text-sm hover:bg-accent">
                  プロフィール
                </button>
                <button className="flex w-full items-center rounded-sm px-3 py-2 text-sm hover:bg-accent">
                  設定
                </button>
                <div className="my-1 h-px bg-border" />
                <button className="flex w-full items-center rounded-sm px-3 py-2 text-sm text-destructive hover:bg-accent">
                  ログアウト
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
