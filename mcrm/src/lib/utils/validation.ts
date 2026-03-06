import { z } from "zod";

// ============================================================================
// Customer Search
// ============================================================================

export const customerSearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  tags: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .optional(),
  membership_tier: z
    .enum(["free", "bronze", "silver", "gold", "platinum"])
    .optional(),
});

export type CustomerSearchInput = z.infer<typeof customerSearchSchema>;

// ============================================================================
// Broadcast Create
// ============================================================================

export const broadcastCreateSchema = z.object({
  title: z.string().min(1, "タイトルは必須です").max(100),
  message_type: z.enum(["text", "flex", "image", "template"]),
  message_content: z.record(z.unknown()).refine(
    (val) => Object.keys(val).length > 0,
    { message: "メッセージ内容は必須です" }
  ),
  target_filter: z
    .record(z.unknown())
    .nullable()
    .optional()
    .default(null),
  scheduled_at: z
    .string()
    .datetime({ message: "有効な日時を指定してください" })
    .optional(),
});

export type BroadcastCreateInput = z.infer<typeof broadcastCreateSchema>;

// ============================================================================
// Event Create
// ============================================================================

export const eventCreateSchema = z
  .object({
    title: z.string().min(1, "タイトルは必須です").max(200),
    description: z.string().nullable().optional(),
    event_type: z.string().min(1, "イベント種別は必須です"),
    start_at: z.string().datetime({ message: "開始日時は有効な日時を指定してください" }),
    end_at: z.string().datetime({ message: "終了日時は有効な日時を指定してください" }),
    capacity: z.coerce.number().int().min(1).nullable().optional(),
    location: z.string().nullable().optional(),
    image_url: z.string().url().nullable().optional(),
  })
  .refine((data) => new Date(data.end_at) > new Date(data.start_at), {
    message: "終了日時は開始日時より後にしてください",
    path: ["end_at"],
  });

export type EventCreateInput = z.infer<typeof eventCreateSchema>;

// ============================================================================
// Reservation Create
// ============================================================================

export const reservationCreateSchema = z.object({
  slot_id: z.string().uuid("有効なスロットIDを指定してください"),
  purpose: z.string().max(500).optional(),
});

export type ReservationCreateInput = z.infer<typeof reservationCreateSchema>;
