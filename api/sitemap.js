"use strict";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  try {
    if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
      return res.status(500).json({
        ok: false,
        error: "환경변수 누락",
        hasUrl: !!SUPABASE_URL,
        hasSecretKey: !!SUPABASE_SECRET_KEY
      });
    }

    let projectRef = "";

    try {
      const u = new URL(SUPABASE_URL);
      projectRef = u.hostname.split(".")[0];
    } catch (e) {
      projectRef = "URL_PARSE_ERROR";
    }

    const endpoint =
      `${SUPABASE_URL}/rest/v1/safe_apartments?select=*&limit=1`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
        Accept: "application/json"
      }
    });

    const body = await response.text();

    return res.status(200).json({
      ok: response.ok,
      projectRef: projectRef,
      supabaseStatus: response.status,
      safeApartmentsVisible: response.ok,
      response: body
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
};
