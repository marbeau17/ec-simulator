import { messagingApi } from "@line/bot-sdk";

const { MessagingApiClient } = messagingApi;

/**
 * LINE Messaging API client singleton.
 * Requires LINE_CHANNEL_ACCESS_TOKEN environment variable.
 */
export const lineClient = new MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
});

/**
 * Reply to a LINE message using a reply token.
 * Reply tokens are single-use and expire shortly after the event.
 */
export async function replyMessage(
  replyToken: string,
  messages: messagingApi.Message[]
): Promise<void> {
  await lineClient.replyMessage({
    replyToken,
    messages,
  });
}

/**
 * Send a push message to a specific user by their LINE user ID.
 */
export async function pushMessage(
  to: string,
  messages: messagingApi.Message[]
): Promise<void> {
  await lineClient.pushMessage({
    to,
    messages,
  });
}

/**
 * Get a user's LINE profile by their user ID.
 */
export async function getProfile(
  userId: string
): Promise<messagingApi.UserProfileResponse> {
  return lineClient.getProfile(userId);
}
