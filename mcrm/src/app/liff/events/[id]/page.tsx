"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getLiffProfile, closeLiff } from "@/lib/line/liff";

interface EventDetail {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_at: string;
  end_at: string;
  capacity: number | null;
  registered_count: number;
  location: string | null;
  image_url: string | null;
}

type PageStatus = "loading" | "ready" | "registering" | "registered" | "error";

export default function LiffEventDetailPage() {
  const params = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [status, setStatus] = useState<PageStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchEvent();
  }, [params.id]);

  async function fetchEvent() {
    try {
      const res = await fetch(`/api/liff/events/${params.id}`);

      if (!res.ok) {
        throw new Error("イベント情報の取得に失敗しました。");
      }

      const data: EventDetail = await res.json();
      setEvent(data);
      setStatus("ready");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "エラーが発生しました。"
      );
      setStatus("error");
    }
  }

  async function handleRegister() {
    if (!event) return;

    setStatus("registering");

    try {
      const profile = await getLiffProfile();

      const res = await fetch(`/api/liff/events/${event.id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          line_user_id: profile.userId,
          display_name: profile.displayName,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "参加登録に失敗しました。");
      }

      setStatus("registered");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "エラーが発生しました。"
      );
      setStatus("error");
    }
  }

  if (status === "loading") {
    return (
      <div style={styles.center}>
        <p style={styles.muted}>読み込み中...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={styles.center}>
        <p style={styles.error}>{errorMessage}</p>
        <button style={styles.buttonSecondary} onClick={() => closeLiff()}>
          閉じる
        </button>
      </div>
    );
  }

  if (status === "registered") {
    return (
      <div style={styles.center}>
        <p style={{ fontSize: "1.25rem", fontWeight: 600 }}>参加登録完了!</p>
        <p style={styles.muted}>イベント当日をお楽しみに。</p>
        <button
          style={{ ...styles.buttonPrimary, marginTop: "1rem" }}
          onClick={() => closeLiff()}
        >
          閉じる
        </button>
      </div>
    );
  }

  if (!event) return null;

  const isFull = event.capacity !== null && event.registered_count >= event.capacity;

  return (
    <div style={styles.container}>
      {event.image_url && (
        <img
          src={event.image_url}
          alt={event.title}
          style={styles.heroImage}
        />
      )}

      <div style={styles.content}>
        <span style={styles.badge}>{event.event_type}</span>
        <h1 style={styles.title}>{event.title}</h1>

        <div style={styles.meta}>
          <p>
            <strong>開始:</strong>{" "}
            {new Date(event.start_at).toLocaleString("ja-JP")}
          </p>
          <p>
            <strong>終了:</strong>{" "}
            {new Date(event.end_at).toLocaleString("ja-JP")}
          </p>
          {event.location && (
            <p>
              <strong>場所:</strong> {event.location}
            </p>
          )}
          {event.capacity !== null && (
            <p>
              <strong>定員:</strong> {event.registered_count} / {event.capacity}名
            </p>
          )}
        </div>

        {event.description && (
          <p style={styles.description}>{event.description}</p>
        )}

        <button
          style={isFull ? styles.buttonDisabled : styles.buttonPrimary}
          disabled={isFull || status === "registering"}
          onClick={handleRegister}
        >
          {isFull
            ? "定員に達しました"
            : status === "registering"
              ? "登録中..."
              : "参加する"}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  center: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100dvh",
    padding: "1rem",
    fontFamily: "sans-serif",
    textAlign: "center",
    gap: "0.5rem",
  },
  container: {
    fontFamily: "sans-serif",
    maxWidth: 480,
    margin: "0 auto",
    paddingBottom: "2rem",
  },
  heroImage: {
    width: "100%",
    height: 200,
    objectFit: "cover",
  },
  content: {
    padding: "1rem",
  },
  badge: {
    display: "inline-block",
    backgroundColor: "#06b6d4",
    color: "#fff",
    fontSize: "0.75rem",
    fontWeight: 600,
    padding: "0.125rem 0.5rem",
    borderRadius: "9999px",
    marginBottom: "0.5rem",
  },
  title: {
    fontSize: "1.25rem",
    fontWeight: 700,
    margin: "0 0 0.75rem",
  },
  meta: {
    fontSize: "0.875rem",
    color: "#374151",
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    marginBottom: "1rem",
  },
  description: {
    fontSize: "0.875rem",
    lineHeight: 1.6,
    color: "#4b5563",
    marginBottom: "1.5rem",
    whiteSpace: "pre-wrap",
  },
  buttonPrimary: {
    width: "100%",
    padding: "0.75rem",
    backgroundColor: "#06c755",
    color: "#fff",
    border: "none",
    borderRadius: "0.5rem",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  buttonSecondary: {
    padding: "0.5rem 1.5rem",
    backgroundColor: "#e5e7eb",
    color: "#374151",
    border: "none",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    cursor: "pointer",
  },
  buttonDisabled: {
    width: "100%",
    padding: "0.75rem",
    backgroundColor: "#d1d5db",
    color: "#6b7280",
    border: "none",
    borderRadius: "0.5rem",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "not-allowed",
  },
  muted: {
    color: "#6b7280",
  },
  error: {
    color: "#dc2626",
  },
};
