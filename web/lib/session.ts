import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "lyrical_fable_session";

export async function getSessionId() {
  const store = await cookies();
  const current = store.get(COOKIE)?.value;
  if (current) return { id: current, isNew: false };
  return { id: randomUUID(), isNew: true };
}

export function setSessionCookie(response: Response, id: string) {
  response.headers.append(
    "Set-Cookie",
    `${COOKIE}=${encodeURIComponent(id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`,
  );
  return response;
}
