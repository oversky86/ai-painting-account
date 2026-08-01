import { createHash, randomBytes } from "node:crypto";

export function generateRandomString(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function generateCodeVerifier(): string {
  return generateRandomString(32);
}

export function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}
