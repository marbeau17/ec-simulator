import liff, { type Liff } from "@line/liff";

let liffInstance: Liff | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the LIFF SDK. Safe to call multiple times;
 * subsequent calls return the existing init promise.
 */
export async function initLiff(): Promise<Liff> {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

  if (!liffId) {
    throw new Error("NEXT_PUBLIC_LIFF_ID is not set");
  }

  if (liffInstance) {
    return liffInstance;
  }

  if (!initPromise) {
    initPromise = liff.init({ liffId }).then(() => {
      liffInstance = liff;
    });
  }

  await initPromise;
  return liff;
}

/**
 * Get the LINE user profile from LIFF.
 * LIFF must be initialized first.
 */
export async function getLiffProfile() {
  const l = await initLiff();

  if (!l.isLoggedIn()) {
    l.login();
    // login() redirects, so code after this won't execute
    throw new Error("Redirecting to LINE login");
  }

  const profile = await l.getProfile();

  return {
    userId: profile.userId,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl ?? null,
    statusMessage: profile.statusMessage ?? null,
  };
}

/**
 * Check if the app is running inside the LINE client.
 */
export function isInClient(): boolean {
  return liff.isInClient();
}

/**
 * Close the LIFF window (only works inside LINE client).
 */
export function closeLiff(): void {
  if (liff.isInClient()) {
    liff.closeWindow();
  }
}
