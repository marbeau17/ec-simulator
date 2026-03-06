/**
 * LINE Webhook event types and parser.
 */

export interface WebhookSource {
  type: "user" | "group" | "room";
  userId?: string;
  groupId?: string;
  roomId?: string;
}

export interface BaseEvent {
  type: string;
  timestamp: number;
  source: WebhookSource;
  replyToken?: string;
  mode: "active" | "standby";
}

export interface FollowEvent extends BaseEvent {
  type: "follow";
  replyToken: string;
}

export interface UnfollowEvent extends BaseEvent {
  type: "unfollow";
}

export interface TextMessageContent {
  type: "text";
  id: string;
  text: string;
}

export interface ImageMessageContent {
  type: "image";
  id: string;
}

export interface StickerMessageContent {
  type: "sticker";
  id: string;
  packageId: string;
  stickerId: string;
}

export type MessageContent =
  | TextMessageContent
  | ImageMessageContent
  | StickerMessageContent;

export interface MessageEvent extends BaseEvent {
  type: "message";
  replyToken: string;
  message: MessageContent;
}

export interface PostbackEvent extends BaseEvent {
  type: "postback";
  replyToken: string;
  postback: {
    data: string;
    params?: {
      date?: string;
      time?: string;
      datetime?: string;
    };
  };
}

export type WebhookEvent =
  | FollowEvent
  | UnfollowEvent
  | MessageEvent
  | PostbackEvent;

export interface WebhookBody {
  destination: string;
  events: WebhookEvent[];
}

/**
 * Parse webhook events from the raw LINE request body.
 */
export function parseEvents(body: string): WebhookEvent[] {
  const parsed: WebhookBody = JSON.parse(body);
  return parsed.events;
}
