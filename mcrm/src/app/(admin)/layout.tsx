"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/admin/sidebar";
import { Header } from "@/components/admin/header";

const pageTitles: Record<string, string> = {
  "/dashboard": "ダッシュボード",
  "/dashboard/customers": "顧客管理",
  "/dashboard/chat": "チャット",
  "/dashboard/messages": "メッセージ配信",
  "/dashboard/messages/new": "新規メッセージ作成",
  "/dashboard/events": "イベント",
  "/dashboard/reservations": "予約管理",
  "/dashboard/analytics": "分析",
  "/dashboard/settings": "設定",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.replace("/login");
          return;
        }
        setAuthenticated(true);
      } catch {
        router.replace("/login");
      }
    }
    checkAuth();
  }, [router]);

  if (authenticated === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const title =
    pageTitles[pathname] ||
    (pathname.startsWith("/dashboard/customers/") ? "顧客詳細" : "") ||
    (pathname.startsWith("/dashboard/chat/") ? "チャット" : "") ||
    "MCRM";

  return (
    <div className="min-h-screen bg-muted/30">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <Header
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
