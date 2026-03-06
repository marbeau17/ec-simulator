// ============================================================================
// LINE Webhook Event Types
// ============================================================================

export interface WebhookRequestBody {
  destination: string;
  events: WebhookEvent[];
}

export type WebhookEvent =
  | FollowEvent
  | UnfollowEvent
  | MessageEvent
  | PostbackEvent;

interface WebhookEventBase {
  replyToken?: string;
  timestamp: number;
  source: EventSource;
  webhookEventId: string;
  deliveryContext: {
    isRedelivery: boolean;
  };
  mode: "active" | "standby";
}

export type EventSource =
  | { type: "user"; userId: string }
  | { type: "group"; groupId: string; userId?: string }
  | { type: "room"; roomId: string; userId?: string };

// --- Follow / Unfollow ---

export interface FollowEvent extends WebhookEventBase {
  type: "follow";
  replyToken: string;
  follow: {
    isUnblocked: boolean;
  };
}

export interface UnfollowEvent extends WebhookEventBase {
  type: "unfollow";
}

// --- Message ---

export interface MessageEvent extends WebhookEventBase {
  type: "message";
  replyToken: string;
  message: TextMessage | ImageMessage | StickerMessage;
}

export interface TextMessage {
  id: string;
  type: "text";
  text: string;
  quoteToken: string;
  emojis?: Array<{
    index: number;
    length: number;
    productId: string;
    emojiId: string;
  }>;
}

export interface ImageMessage {
  id: string;
  type: "image";
  contentProvider: {
    type: "line" | "external";
    originalContentUrl?: string;
    previewImageUrl?: string;
  };
  quoteToken: string;
}

export interface StickerMessage {
  id: string;
  type: "sticker";
  packageId: string;
  stickerId: string;
  stickerResourceType: "STATIC" | "ANIMATION" | "SOUND" | "ANIMATION_SOUND" | "POPUP" | "POPUP_SOUND";
  quoteToken: string;
}

// --- Postback ---

export interface PostbackEvent extends WebhookEventBase {
  type: "postback";
  replyToken: string;
  postback: {
    data: string;
    params?: {
      date?: string;
      time?: string;
      datetime?: string;
      newRichMenuAliasId?: string;
      status?: string;
    };
  };
}

/**
 * Utility: parse postback data string "key=value&key2=value2" into a record.
 */
export function parsePostbackData(data: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const pair of data.split("&")) {
    const [key, ...rest] = pair.split("=");
    if (key) {
      params[key] = decodeURIComponent(rest.join("="));
    }
  }
  return params;
}

// ============================================================================
// LINE Profile
// ============================================================================

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  language?: string;
}

// ============================================================================
// LINE Messaging API Request Types
// ============================================================================

export interface ReplyMessageRequest {
  replyToken: string;
  messages: LineMessageObject[];
  notificationDisabled?: boolean;
}

export interface PushMessageRequest {
  to: string;
  messages: LineMessageObject[];
  notificationDisabled?: boolean;
  customAggregationUnits?: string[];
}

export interface MulticastRequest {
  to: string[];
  messages: LineMessageObject[];
  notificationDisabled?: boolean;
  customAggregationUnits?: string[];
}

export interface BroadcastRequest {
  messages: LineMessageObject[];
  notificationDisabled?: boolean;
}

// ============================================================================
// LINE Message Objects
// ============================================================================

export type LineMessageObject =
  | TextMessageObject
  | ImageMessageObject
  | StickerMessageObject
  | FlexMessageObject
  | TemplateMessageObject;

export interface TextMessageObject {
  type: "text";
  text: string;
  quoteToken?: string;
}

export interface ImageMessageObject {
  type: "image";
  originalContentUrl: string;
  previewImageUrl: string;
}

export interface StickerMessageObject {
  type: "sticker";
  packageId: string;
  stickerId: string;
}

export interface FlexMessageObject {
  type: "flex";
  altText: string;
  contents: FlexContainer;
}

export interface TemplateMessageObject {
  type: "template";
  altText: string;
  template: TemplateContent;
}

// ============================================================================
// Flex Message Types (basic)
// ============================================================================

export type FlexContainer = FlexBubble | FlexCarousel;

export interface FlexBubble {
  type: "bubble";
  size?: "nano" | "micro" | "kilo" | "mega" | "giga";
  direction?: "ltr" | "rtl";
  header?: FlexBox;
  hero?: FlexImage | FlexBox;
  body?: FlexBox;
  footer?: FlexBox;
  styles?: {
    header?: FlexBlockStyle;
    hero?: FlexBlockStyle;
    body?: FlexBlockStyle;
    footer?: FlexBlockStyle;
  };
  action?: FlexAction;
}

export interface FlexCarousel {
  type: "carousel";
  contents: FlexBubble[];
}

export interface FlexBox {
  type: "box";
  layout: "horizontal" | "vertical" | "baseline";
  contents: FlexComponent[];
  flex?: number;
  spacing?: string;
  margin?: string;
  paddingAll?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingStart?: string;
  paddingEnd?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: string;
  cornerRadius?: string;
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  alignItems?: "flex-start" | "center" | "flex-end";
  action?: FlexAction;
}

export type FlexComponent = FlexBox | FlexText | FlexImage | FlexButton | FlexSeparator | FlexFiller;

export interface FlexText {
  type: "text";
  text: string;
  flex?: number;
  size?: string;
  color?: string;
  weight?: "regular" | "bold";
  align?: "start" | "center" | "end";
  wrap?: boolean;
  maxLines?: number;
  margin?: string;
  action?: FlexAction;
}

export interface FlexImage {
  type: "image";
  url: string;
  flex?: number;
  size?: string;
  aspectRatio?: string;
  aspectMode?: "cover" | "fit";
  backgroundColor?: string;
  margin?: string;
  action?: FlexAction;
}

export interface FlexButton {
  type: "button";
  action: FlexAction;
  flex?: number;
  margin?: string;
  height?: "sm" | "md";
  style?: "primary" | "secondary" | "link";
  color?: string;
}

export interface FlexSeparator {
  type: "separator";
  margin?: string;
  color?: string;
}

export interface FlexFiller {
  type: "filler";
  flex?: number;
}

export interface FlexBlockStyle {
  backgroundColor?: string;
  separator?: boolean;
  separatorColor?: string;
}

// ============================================================================
// Flex Actions
// ============================================================================

export type FlexAction =
  | URIAction
  | MessageAction
  | PostbackAction
  | DatetimePickerAction;

export interface URIAction {
  type: "uri";
  label?: string;
  uri: string;
}

export interface MessageAction {
  type: "message";
  label?: string;
  text: string;
}

export interface PostbackAction {
  type: "postback";
  label?: string;
  data: string;
  displayText?: string;
}

export interface DatetimePickerAction {
  type: "datetimepicker";
  label?: string;
  data: string;
  mode: "date" | "time" | "datetime";
  initial?: string;
  max?: string;
  min?: string;
}

// ============================================================================
// Template Message Types
// ============================================================================

export type TemplateContent =
  | ButtonsTemplate
  | ConfirmTemplate
  | CarouselTemplate;

export interface ButtonsTemplate {
  type: "buttons";
  thumbnailImageUrl?: string;
  imageAspectRatio?: "rectangle" | "square";
  imageSize?: "cover" | "contain";
  imageBackgroundColor?: string;
  title?: string;
  text: string;
  defaultAction?: FlexAction;
  actions: FlexAction[];
}

export interface ConfirmTemplate {
  type: "confirm";
  text: string;
  actions: [FlexAction, FlexAction];
}

export interface CarouselTemplate {
  type: "carousel";
  columns: CarouselColumn[];
  imageAspectRatio?: "rectangle" | "square";
  imageSize?: "cover" | "contain";
}

export interface CarouselColumn {
  thumbnailImageUrl?: string;
  imageBackgroundColor?: string;
  title?: string;
  text: string;
  defaultAction?: FlexAction;
  actions: FlexAction[];
}
