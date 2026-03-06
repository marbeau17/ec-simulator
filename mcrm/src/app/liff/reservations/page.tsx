"use client";

import { useEffect, useState, useMemo } from "react";
import { getLiffProfile, closeLiff } from "@/lib/line/liff";

interface ReservationSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
}

type Step = "date" | "time" | "confirm" | "done";

export default function LiffReservationsPage() {
  const [slots, setSlots] = useState<ReservationSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("date");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ReservationSlot | null>(null);
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSlots();
  }, []);

  async function fetchSlots() {
    try {
      const res = await fetch("/api/liff/reservations/slots");

      if (!res.ok) {
        throw new Error("予約枠の取得に失敗しました。");
      }

      const data: ReservationSlot[] = await res.json();
      setSlots(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "エラーが発生しました。"
      );
    } finally {
      setLoading(false);
    }
  }

  const availableDates = useMemo(() => {
    const dateSet = new Set<string>();
    for (const slot of slots) {
      if (slot.booked_count < slot.capacity) {
        dateSet.add(slot.date);
      }
    }
    return Array.from(dateSet).sort();
  }, [slots]);

  const timeSlotsForDate = useMemo(() => {
    if (!selectedDate) return [];
    return slots
      .filter((s) => s.date === selectedDate && s.booked_count < s.capacity)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [slots, selectedDate]);

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
    setStep("time");
  }

  function handleSelectSlot(slot: ReservationSlot) {
    setSelectedSlot(slot);
    setStep("confirm");
  }

  async function handleConfirm() {
    if (!selectedSlot) return;

    setSubmitting(true);

    try {
      const profile = await getLiffProfile();

      const res = await fetch("/api/liff/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: selectedSlot.id,
          line_user_id: profile.userId,
          display_name: profile.displayName,
          purpose: purpose || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "予約に失敗しました。");
      }

      setStep("done");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "エラーが発生しました。"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function formatDateJP(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00+09:00");
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    return `${d.getMonth() + 1}/${d.getDate()}(${weekdays[d.getDay()]})`;
  }

  if (loading) {
    return (
      <div style={styles.center}>
        <p style={styles.muted}>読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.center}>
        <p style={styles.error}>{error}</p>
        <button style={styles.buttonSecondary} onClick={() => closeLiff()}>
          閉じる
        </button>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div style={styles.center}>
        <p style={{ fontSize: "1.25rem", fontWeight: 600 }}>予約完了!</p>
        <p style={styles.muted}>ご予約ありがとうございます。</p>
        <button
          style={{ ...styles.buttonPrimary, marginTop: "1rem", width: "auto" }}
          onClick={() => closeLiff()}
        >
          閉じる
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>予約</h1>

      {/* Step indicator */}
      <div style={styles.steps}>
        <span style={step === "date" ? styles.stepActive : styles.stepInactive}>
          日付選択
        </span>
        <span style={{ color: "#d1d5db" }}>&gt;</span>
        <span style={step === "time" ? styles.stepActive : styles.stepInactive}>
          時間選択
        </span>
        <span style={{ color: "#d1d5db" }}>&gt;</span>
        <span
          style={step === "confirm" ? styles.stepActive : styles.stepInactive}
        >
          確認
        </span>
      </div>

      {/* Date selection */}
      {step === "date" && (
        <div style={styles.grid}>
          {availableDates.length === 0 ? (
            <p style={styles.muted}>現在、予約可能な日程はありません。</p>
          ) : (
            availableDates.map((date) => (
              <button
                key={date}
                style={styles.dateButton}
                onClick={() => handleSelectDate(date)}
              >
                {formatDateJP(date)}
              </button>
            ))
          )}
        </div>
      )}

      {/* Time slot selection */}
      {step === "time" && (
        <div>
          <button
            style={styles.backButton}
            onClick={() => setStep("date")}
          >
            &larr; 日付を選び直す
          </button>
          <p style={styles.dateLabel}>{selectedDate && formatDateJP(selectedDate)}</p>
          <div style={styles.grid}>
            {timeSlotsForDate.map((slot) => (
              <button
                key={slot.id}
                style={styles.timeButton}
                onClick={() => handleSelectSlot(slot)}
              >
                {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                <span style={styles.remaining}>
                  残り{slot.capacity - slot.booked_count}枠
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation */}
      {step === "confirm" && selectedSlot && selectedDate && (
        <div>
          <button
            style={styles.backButton}
            onClick={() => setStep("time")}
          >
            &larr; 時間を選び直す
          </button>
          <div style={styles.confirmCard}>
            <p>
              <strong>日付:</strong> {formatDateJP(selectedDate)}
            </p>
            <p>
              <strong>時間:</strong> {selectedSlot.start_time.slice(0, 5)} -{" "}
              {selectedSlot.end_time.slice(0, 5)}
            </p>

            <label style={styles.label}>
              ご利用目的（任意）
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="例: カウンセリング"
                style={styles.input}
              />
            </label>

            <button
              style={styles.buttonPrimary}
              disabled={submitting}
              onClick={handleConfirm}
            >
              {submitting ? "予約中..." : "予約を確定する"}
            </button>
          </div>
        </div>
      )}
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
    padding: "1rem",
  },
  heading: {
    fontSize: "1.25rem",
    fontWeight: 700,
    marginBottom: "0.75rem",
  },
  steps: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginBottom: "1.5rem",
    fontSize: "0.8rem",
  },
  stepActive: {
    fontWeight: 700,
    color: "#06c755",
  },
  stepInactive: {
    color: "#9ca3af",
  },
  grid: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  dateButton: {
    padding: "0.75rem 1rem",
    border: "1px solid #e5e7eb",
    borderRadius: "0.5rem",
    background: "#fff",
    fontSize: "1rem",
    cursor: "pointer",
    textAlign: "left",
  },
  timeButton: {
    padding: "0.75rem 1rem",
    border: "1px solid #e5e7eb",
    borderRadius: "0.5rem",
    background: "#fff",
    fontSize: "0.95rem",
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  remaining: {
    fontSize: "0.75rem",
    color: "#6b7280",
  },
  dateLabel: {
    fontWeight: 600,
    marginBottom: "0.75rem",
    fontSize: "1rem",
  },
  backButton: {
    background: "none",
    border: "none",
    color: "#06c755",
    fontSize: "0.875rem",
    cursor: "pointer",
    padding: 0,
    marginBottom: "1rem",
  },
  confirmCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "0.75rem",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    fontSize: "0.875rem",
    fontWeight: 500,
  },
  input: {
    padding: "0.5rem 0.75rem",
    border: "1px solid #d1d5db",
    borderRadius: "0.375rem",
    fontSize: "0.875rem",
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
  muted: { color: "#6b7280" },
  error: { color: "#dc2626" },
};
