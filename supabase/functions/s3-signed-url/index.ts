import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface S3Settings {
  enabled: boolean;
  bucket_name: string;
  region: string;
  access_key_id: string;
  secret_access_key: string;
  endpoint?: string;
  path_prefix?: string;
  public_url?: string;
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key instanceof ArrayBuffer ? key : key.buffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
}

async function sha256(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return toHex(hash);
}

async function getSignatureKey(key: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(new TextEncoder().encode("AWS4" + key), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "TRACE") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { path: filePath } = await req.json();
    if (!filePath) {
      return new Response(JSON.stringify({ error: "Missing path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization: user can only access their own private files, or admins can access any
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    // Private files are stored as bucket/userId/... - check ownership
    const pathParts = filePath.split("/");
    // e.g. "national-ids/userId/file.pdf" or just the s3Key which may include prefix
    const ownsFile = pathParts.some((part: string) => part === user.id);

    if (!isAdmin && !ownsFile) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get S3 settings
    const { data: settingsRow } = await adminClient
      .from("site_settings")
      .select("value")
      .eq("key", "s3_storage_settings")
      .maybeSingle();

    if (!settingsRow?.value) {
      return new Response(JSON.stringify({ error: "S3 storage not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const s3: S3Settings = settingsRow.value as any;
    if (!s3.enabled) {
      return new Response(JSON.stringify({ error: "S3 storage is disabled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build presigned URL (valid for 15 minutes)
    const s3Key = s3.path_prefix
      ? `${s3.path_prefix.replace(/\/+$/, "")}/${filePath}`
      : filePath;

    const host = s3.endpoint
      ? s3.endpoint.replace(/^https?:\/\//, "").replace(/\/+$/, "")
      : `${s3.bucket_name}.s3.${s3.region}.amazonaws.com`;
    const baseUrl = s3.endpoint
      ? `${s3.endpoint.replace(/\/+$/, "")}/${s3.bucket_name}`
      : `https://${host}`;

    const expiresIn = 900; // 15 minutes
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const scope = `${dateStamp}/${s3.region}/s3/aws4_request`;

    const canonicalUri = new URL(`${baseUrl}/${s3Key}`).pathname;
    const hostHeader = new URL(`${baseUrl}/${s3Key}`).host;

    // Query string parameters for presigned URL
    const queryParams = new URLSearchParams({
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": `${s3.access_key_id}/${scope}`,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": String(expiresIn),
      "X-Amz-SignedHeaders": "host",
    });

    // Sort query params for canonical request
    const sortedParams = [...queryParams.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    const canonicalHeaders = `host:${hostHeader}\n`;
    const signedHeaders = "host";

    const canonicalRequest = [
      "GET",
      canonicalUri,
      sortedParams,
      canonicalHeaders,
      signedHeaders,
      "UNSIGNED-PAYLOAD",
    ].join("\n");

    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      scope,
      await sha256(new TextEncoder().encode(canonicalRequest)),
    ].join("\n");

    const signingKey = await getSignatureKey(s3.secret_access_key, dateStamp, s3.region, "s3");
    const signature = toHex(await hmacSha256(signingKey, stringToSign));

    const presignedUrl = `${baseUrl}/${s3Key}?${sortedParams}&X-Amz-Signature=${signature}`;

    return new Response(
      JSON.stringify({ url: presignedUrl, expires_in: expiresIn }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("S3 signed URL error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
