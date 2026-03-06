"use client";

import { useEffect, useState } from "react";
import { initLiff } from "@/lib/line/liff";

export default function LiffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initLiff()
      .then(() => {
        setReady(true);
      })
      .catch((err) => {
        console.error("LIFF initialization failed:", err);
        setError("LIFFの初期化に失敗しました。");
      });
  }, []);

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100dvh",
          padding: "1rem",
          fontFamily: "sans-serif",
        }}
      >
        <p style={{ color: "#dc2626", textAlign: "center" }}>{error}</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100dvh",
          fontFamily: "sans-serif",
        }}
      >
        <p style={{ color: "#6b7280" }}>読み込み中...</p>
      </div>
    );
  }

  return <>{children}</>;
}
