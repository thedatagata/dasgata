// routes/_middleware.ts
import { FreshContext } from "$fresh/server.ts";

interface SessionState {
  sessionId: string;
}

export async function handler(
  req: Request,
  ctx: FreshContext<SessionState>
) {
  const sessionId = getOrCreateSessionId(req);
  ctx.state.sessionId = sessionId;
  
  const resp = await ctx.next();
  
  // Set session cookie if new
  if (!req.headers.get("Cookie")?.includes("session_id")) {
    resp.headers.set("Set-Cookie", 
      `session_id=${sessionId}; Path=/; Max-Age=2592000; SameSite=Lax; Secure`
    );
  }
  
  // Add CORS headers for DuckDB-WASM
  resp.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  resp.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  
  return resp;
}

function getOrCreateSessionId(req: Request): string {
  const cookieHeader = req.headers.get("Cookie") || "";
  const match = cookieHeader.match(/session_id=([^;]+)/);
  
  if (match) {
    return match[1];
  }
  
  return crypto.randomUUID();
}