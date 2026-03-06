import crypto from "crypto";

/**
 * Verify LINE webhook signature using HMAC-SHA256.
 * Compares the signature header from LINE with a computed digest
 * of the raw request body using the channel secret.
 */
export function verifySignature(body: string, signature: string): boolean {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) {
    throw new Error("LINE_CHANNEL_SECRET environment variable is not set");
  }

  const digest = crypto
    .createHmac("SHA256", channelSecret)
    .update(body)
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(digest, "utf-8"),
    Buffer.from(signature, "utf-8")
  );
}
