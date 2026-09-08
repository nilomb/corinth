/**
 * HTTP Basic Auth gate — keeps the Pages site private.
 * Secrets: SITE_USER, SITE_PASSWORD (wrangler pages secret put)
 */
export async function onRequest(context) {
  const user = context.env.SITE_USER || "corinth";
  const pass = context.env.SITE_PASSWORD;
  if (!pass) {
    return new Response("Site locked: missing SITE_PASSWORD secret", {
      status: 503,
    });
  }

  const header = context.request.headers.get("Authorization") || "";
  const expected =
    "Basic " + btoa(`${user}:${pass}`);

  if (header !== expected) {
    return new Response("Password richiesta", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Corinth privato"',
        "Cache-Control": "no-store",
      },
    });
  }

  return context.next();
}
