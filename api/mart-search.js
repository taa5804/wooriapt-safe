"use strict";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  "https://dcysjuxyjqtvkihdsjvv.supabase.co";

const SUPABASE_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY;

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "s-maxage=3600, stale-while-revalidate=86400"
  );

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      message: "GET 요청만 허용됩니다."
    });
  }

  if (!SUPABASE_KEY) {
    return res.status(500).json({
      ok: false,
      message: "Supabase 환경변수가 설정되지 않았습니다."
    });
  }

  const q = String(req.query.q || "").trim();

  if (!q) {
    return res.status(400).json({
      ok: false,
      message: "마트 검색어를 입력해주세요."
    });
  }

  try {
    const params = new URLSearchParams();

    params.set(
      "select",
      "id,mart_code,mart_name,approval_status,service_status"
    );

    params.set("mart_name", `ilike.*${q}*`);
    params.set("order", "mart_name.asc");
    params.set("limit", "50");

    const url =
      `${SUPABASE_URL}/rest/v1/mart_members?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();

      return res.status(response.status).json({
        ok: false,
        message: "마트 DB 조회에 실패했습니다.",
        error: errorText
      });
    }

    const rows = await response.json();

    return res.status(200).json({
      ok: true,
      query: q,
      count: rows.length,
      marts: rows
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "마트 검색 중 오류가 발생했습니다.",
      error: String(error.message || error)
    });
  }
};
