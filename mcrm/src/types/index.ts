// Re-export all database types
export type {
  // Row types
  User,
  Tag,
  UserTag,
  Conversation,
  Message,
  Event,
  EventRegistration,
  ReservationSlot,
  Reservation,
  AiHearing,
  BroadcastJob,
  BroadcastLog,
  EcInsight,
  AuditLog,
  AdminUser,
  // Insert types
  UserInsert,
  TagInsert,
  UserTagInsert,
  ConversationInsert,
  MessageInsert,
  EventInsert,
  EventRegistrationInsert,
  ReservationSlotInsert,
  ReservationInsert,
  AiHearingInsert,
  BroadcastJobInsert,
  BroadcastLogInsert,
  EcInsightInsert,
  AuditLogInsert,
  AdminUserInsert,
  // Update types
  UserUpdate,
  TagUpdate,
  ConversationUpdate,
  MessageUpdate,
  EventUpdate,
  EventRegistrationUpdate,
  ReservationSlotUpdate,
  ReservationUpdate,
  AiHearingUpdate,
  BroadcastJobUpdate,
  EcInsightUpdate,
  AuditLogUpdate,
  AdminUserUpdate,
  // Database mapping
  Database,
} from "./database";

// Re-export all LINE types
export type {
  WebhookRequestBody,
  WebhookEvent,
  EventSource,
  FollowEvent,
  UnfollowEvent,
  MessageEvent,
  TextMessage,
  ImageMessage,
  StickerMessage,
  PostbackEvent,
  LineProfile,
  ReplyMessageRequest,
  PushMessageRequest,
  MulticastRequest,
  BroadcastRequest,
  LineMessageObject,
  TextMessageObject,
  ImageMessageObject,
  StickerMessageObject,
  FlexMessageObject,
  TemplateMessageObject,
  FlexContainer,
  FlexBubble,
  FlexCarousel,
  FlexBox,
  FlexComponent,
  FlexText,
  FlexImage,
  FlexButton,
  FlexSeparator,
  FlexFiller,
  FlexBlockStyle,
  FlexAction,
  URIAction,
  MessageAction,
  PostbackAction,
  DatetimePickerAction,
  TemplateContent,
  ButtonsTemplate,
  ConfirmTemplate,
  CarouselTemplate,
  CarouselColumn,
} from "./line";

export { parsePostbackData } from "./line";

// ============================================================================
// API Response Types
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}
