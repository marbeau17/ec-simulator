import { NextRequest, NextResponse } from "next/server";
import { verifySignature } from "@/lib/line/verify-signature";
import { parseEvents } from "@/lib/line/webhook";
import type { WebhookEvent } from "@/lib/line/webhook";
import { handleFollow } from "./handlers/follow";
import { handleUnfollow } from "./handlers/unfollow";
import { handleMessage } from "./handlers/message";
import { handlePostback } from "./handlers/postback";

/**
 * Route webhook events to the appropriate handler.
 */
async function routeEvent(event: WebhookEvent): Promise<void> {
  switch (event.type) {
    case "follow":
      await handleFollow(event);
      break;
    case "unfollow":
      await handleUnfollow(event);
      break;
    case "message":
      await handleMessage(event);
      break;
    case "postback":
      await handlePostback(event);
      break;
    default:
      console.log(`Unhandled event type: ${(event as WebhookEvent).type}`);
  }
}

/**
 * Process all webhook events asynchronously.
 */
async function processEvents(events: WebhookEvent[]): Promise<void> {
  for (const event of events) {
    try {
      await routeEvent(event);
    } catch (error) {
      console.error(`Error processing event ${event.type}:`, error);
    }
  }
}

/**
 * POST /api/webhook/line
 *
 * LINE webhook endpoint. Verifies the request signature,
 * returns 200 immediately, and processes events asynchronously
 * using the waitUntil pattern.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing x-line-signature header" },
      { status: 401 }
    );
  }

  try {
    if (!verifySignature(body, signature)) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Signature verification error:", error);
    return NextResponse.json(
      { error: "Signature verification failed" },
      { status: 500 }
    );
  }

  const events = parseEvents(body);

  // Use waitUntil to process events asynchronously after returning 200.
  // In Next.js App Router, we leverage the fact that the runtime keeps
  // the function alive until all promises settle.
  const processingPromise = processEvents(events);

  // waitUntil is available in Vercel Edge/Serverless runtime
  // @ts-expect-error waitUntil may not be typed in all environments
  if (typeof globalThis.waitUntil === "function") {
    // @ts-expect-error waitUntil may not be typed in all environments
    globalThis.waitUntil(processingPromise);
  } else {
    // Fallback: fire-and-forget but catch errors
    processingPromise.catch((error) => {
      console.error("Error processing webhook events:", error);
    });
  }

  return NextResponse.json({ status: "ok" });
}
