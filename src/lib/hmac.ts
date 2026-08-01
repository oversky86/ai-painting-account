import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnv } from "./env";

export function signBody(timestamp: string, rawBody: string): string {
  const { hmacSecret } = getEnv();
  return createHmac("sha256", hmacSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
}

export function verifySignature(
  timestamp: string,
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  try {
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}

export async function postSignedWrite(
  path: string,
  payload: Record<string, unknown>,
): Promise<Response> {
  const { appWriteApiUrl } = getEnv();
  const rawBody = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signBody(timestamp, rawBody);
  return fetch(`${appWriteApiUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Account-Timestamp": timestamp,
      "X-Account-Signature": signature,
    },
    body: rawBody,
  });
}
