export function waitForMcpAuthorization(popup: Window, id: string) {
  return new Promise<{ id: string; code: string; state: string; issuer?: string }>((resolve, reject) => {
    const cleanup = () => { window.removeEventListener("message", receive); window.clearInterval(poll); window.clearTimeout(timeout); };
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== popup || event.data?.type !== "reacher-mcp-oauth" || event.data?.id !== id) return;
      cleanup();
      if (event.data.failed || typeof event.data.code !== "string" || typeof event.data.state !== "string") return reject(new Error("Authorization was not completed."));
      resolve({ id, code: event.data.code, state: event.data.state, issuer: event.data.issuer || undefined });
    };
    window.addEventListener("message", receive);
    const poll = window.setInterval(() => { if (popup.closed) { cleanup(); reject(new Error("Authorization window closed.")); } }, 500);
    const timeout = window.setTimeout(() => { cleanup(); popup.close(); reject(new Error("Authorization expired. Retry.")); }, 300_000);
  });
}