export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Crawler-Key");
  if (req.method === "OPTIONS") return res.status(200).end();

  const EXPECTED_KEY = process.env.CRAWLER_SYNC_KEY || "wooriapt-naver-auto-2026-5804";
  const providedKey = String(req.headers["x-crawler-key"] || req.query.key || "").trim();
  if (providedKey !== EXPECTED_KEY) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ ok: false, message: "Supabase env missing" });
  }

  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json"
  };

  try {
    if (req.method === "GET") {
      const since = String(req.query.since || "2026-11-27T00:00:00Z").trim();
      const url =
        `${SUPABASE_URL}/rest/v1/property_requests` +
        `?status=eq.OPEN&created_at=gte.${encodeURIComponent(since)}` +
        `&select=id,request_number,request_type,sido,sigungu,dong,apartment,size,sale_min,sale_max,jeonse_min,jeonse_max,monthly_deposit_min,monthly_deposit_max,monthly_rent,move_date,move_flexible,memo,phone,ars_round,created_at` +
        `&order=id.desc&limit=30`;

      const resp = await fetch(url, { method: "GET", headers });
      const rows = await resp.json().catch(() => []);
      if (!resp.ok) {
        return res.status(500).json({ ok: false, message: "Supabase fetch failed", detail: rows });
      }

      const pending = (Array.isArray(rows) ? rows : []).filter((r) => {
        const p = String(r.phone || "").replace(/\D/g, "");
        if (p === "01000005804" || p === "01058045804") return false;
        return !r.ars_round || Number(r.ars_round) === 0;
      });

      return res.status(200).json({ ok: true, count: pending.length, requests: pending });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const requestNumber = String(body.requestNumber || "").replace(/\D/g, "").slice(0, 4);
      if (requestNumber.length !== 4) {
        return res.status(400).json({ ok: false, message: "Invalid requestNumber" });
      }

      const brokers = Array.isArray(body.brokers) ? body.brokers : [];
      const roundNo = Number(body.roundNo) || 1;
      const now = new Date().toISOString();

      if (brokers.length > 0) {
        const logRows = brokers
          .filter((b) => /^010[0-9]{8}$/.test(String(b.phone || "").replace(/\D/g, "")))
          .map((b) => ({
            request_number: requestNumber,
            broker_id: b.id ? String(b.id) : null,
            broker_type: "NAVER_AUTO",
            broker_phone: String(b.phone || "").replace(/\D/g, ""),
            broker_office: b.office || null,
            round_no: roundNo,
            call_status: b.ok ? "LMS_SENT" : "LMS_FAILED",
            sent_at: b.ok ? now : null
          }));
        if (logRows.length > 0) {
          await fetch(`${SUPABASE_URL}/rest/v1/ars_dispatch_logs`, {
            method: "POST",
            headers: { ...headers, Prefer: "return=minimal" },
            body: JSON.stringify(logRows)
          }).catch(() => null);
        }
      }

      await fetch(
        `${SUPABASE_URL}/rest/v1/property_requests?request_number=eq.${encodeURIComponent(requestNumber)}`,
        {
          method: "PATCH",
          headers: { ...headers, Prefer: "return=minimal" },
          body: JSON.stringify({
            ars_round: roundNo,
            updated_at: now
          })
        }
      );

      return res.status(200).json({ ok: true, requestNumber, roundNo, logged: brokers.length });
    }

    return res.status(405).json({ ok: false, message: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ ok: false, message: String(err && err.message ? err.message : err) });
  }
}
