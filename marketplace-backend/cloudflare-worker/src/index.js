const ALLOWED_ORIGINS = new Set([
  "https://cyclify.in",
  "https://www.cyclify.in",
  "http://127.0.0.1:8765",
]);

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://cyclify.in",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

async function verifyFirebaseUser(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice(7);
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
  if (!response.ok) return null;
  const payload = await response.json();
  if (payload.aud !== env.FIREBASE_PROJECT_ID || Number(payload.exp) * 1000 <= Date.now()) return null;
  return { uid: payload.sub, email: payload.email || "" };
}

function safeExtension(file) {
  const byType = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/webm": "webm",
    "video/mp4": "mp4",
  };
  return byType[file.type] || "bin";
}

function mediaRules(file, kind) {
  const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  const videoTypes = new Set(["video/webm", "video/mp4"]);
  if (kind === "image" && !imageTypes.has(file.type)) return "Only JPG, PNG and WebP images are allowed.";
  if (kind === "video" && !videoTypes.has(file.type)) return "Only WebM and MP4 videos are allowed.";
  if (kind === "image" && file.size > 800 * 1024) return "Each compressed image must be below 800 KB.";
  if (kind === "video" && file.size > 4 * 1024 * 1024) return "The compressed video must be below 4 MB.";
  return "";
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });

    if (request.method === "GET" && url.pathname.startsWith("/media/")) {
      const key = decodeURIComponent(url.pathname.slice(7));
      const object = await env.CYCLIFY_MEDIA.get(key);
      if (!object) return new Response("Not found", { status: 404 });
      const headers = new Headers(corsHeaders(origin));
      object.writeHttpMetadata(headers);
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      headers.set("ETag", object.httpEtag);
      return new Response(object.body, { headers });
    }

    if (request.method === "POST" && url.pathname === "/upload") {
      if (!ALLOWED_ORIGINS.has(origin)) return json({ error: "Origin not allowed" }, 403, origin);
      const user = await verifyFirebaseUser(request, env);
      if (!user) return json({ error: "Login required" }, 401, origin);
      const form = await request.formData();
      const file = form.get("file");
      const kind = form.get("kind") === "video" ? "video" : "image";
      if (!(file instanceof File)) return json({ error: "Media file missing" }, 400, origin);
      const validationError = mediaRules(file, kind);
      if (validationError) return json({ error: validationError }, 400, origin);
      const key = `${user.uid}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${safeExtension(file)}`;
      await env.CYCLIFY_MEDIA.put(key, file.stream(), {
        httpMetadata: { contentType: file.type },
        customMetadata: { ownerId: user.uid, kind, uploadedAt: new Date().toISOString() },
      });
      return json({ key, url: `${url.origin}/media/${encodeURIComponent(key)}` }, 201, origin);
    }

    if (request.method === "DELETE" && url.pathname.startsWith("/media/")) {
      const user = await verifyFirebaseUser(request, env);
      if (!user) return json({ error: "Login required" }, 401, origin);
      const key = decodeURIComponent(url.pathname.slice(7));
      if (!key.startsWith(`${user.uid}/`)) return json({ error: "Not allowed" }, 403, origin);
      await env.CYCLIFY_MEDIA.delete(key);
      return json({ deleted: true }, 200, origin);
    }

    return json({ service: "Cyclify Used Market Media", ready: true }, 200, origin);
  },
};
