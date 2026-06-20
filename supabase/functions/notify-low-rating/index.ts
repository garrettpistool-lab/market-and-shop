import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFY_FROM = Deno.env.get("NOTIFY_FROM_EMAIL") || "Market and Shop <onboarding@resend.dev>";
const APP_URL = Deno.env.get("APP_URL") || "https://your-app.vercel.app";

interface Payload {
  review_id: number;
  vendor_id: number;
  vendor_email?: string;
  vendor_name?: string;
  rating: number;
  comment?: string;
  grace_deadline?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    const body = (await req.json()) as Payload;
    const { vendor_email, vendor_name, rating, comment, vendor_id, grace_deadline } = body;

    if (!vendor_email) {
      return json({ ok: false, error: "vendor_email required" }, 400);
    }

    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set — skipping email");
      return json({ ok: true, emailed: false, reason: "RESEND_API_KEY not configured" });
    }

    const deadline = grace_deadline
      ? new Date(grace_deadline).toLocaleDateString("en-US", { dateStyle: "medium" })
      : "3 days";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: [vendor_email],
        subject: `⚠️ Low rating alert (${rating}★) — ${vendor_name || "your storefront"}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:520px">
            <h2 style="color:#083a9b">Low rating on Market and Shop</h2>
            <p>A customer left a <strong>${rating}-star</strong> review on your vendor profile.</p>
            <blockquote style="border-left:4px solid #f59e0b;padding-left:12px;color:#444">
              ${escapeHtml(comment || "(no comment)")}
            </blockquote>
            <p>You have until <strong>${deadline}</strong> to make it right in your
            <a href="${APP_URL}/vendor-dashboard">Vendor Dashboard</a>. If unresolved, the review may be published publicly.</p>
            <p style="font-size:12px;color:#888">Market and Shop • Local Vendor Marketplace</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend error:", errText);
      return json({ ok: false, error: errText }, 502);
    }

    return json({ ok: true, emailed: true });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: String(e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}