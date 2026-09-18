"use strict";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  "https://dcysjuxyjqtvkihdsjvv.supabase.co";

const SUPABASE_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY;

const BASE_URL = "https://www.wooriapt.app";

const PAGE_SIZE = 5000;

function xmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function encodePart(value) {
  return encodeURIComponent(String(value || "").trim());
}

module.exports = async function handler(req, res) {

  if (req.method !== "GET") {
    res.statusCode = 405;
    return res.end("Method Not Allowed");
  }

  if (!SUPABASE_KEY) {
    res.statusCode = 500;
    return res.end("Supabase environment variable missing");
  }

  const page = Math.max(
    1,
    parseInt(req.query.page || "1", 10)
  );

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  try {

    const params = new URLSearchParams();

    params.set(
      "select",
      "id,mart_code,mart_name"
    );

    params.set(
      "order",
      "id.asc"
    );

    const url =
      `${SUPABASE_URL}/rest/v1/mart_members?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",

      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: "application/json",

        Range: `${from}-${to}`,
        Prefer: "count=exact"
      }
    });

    if (!response.ok) {

      const errorText = await response.text();

      res.statusCode = response.status;

      return res.end(
        `Mart sitemap DB error: ${errorText}`
      );
    }

    const rows = await response.json();

    const urls = rows
      .filter(row => row && row.mart_name)
      .map(row => {

        const martName =
          encodePart(row.mart_name);

        const martCode =
          encodePart(row.mart_code || row.id);

        const loc =
          `${BASE_URL}/mart-search/${martCode}/${martName}`;

        return `
  <url>
    <loc>${xmlEscape(loc)}</loc>
  </url>`;

      })
      .join("");

    const xml =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    res.statusCode = 200;

    res.setHeader(
      "Content-Type",
      "application/xml; charset=utf-8"
    );

    res.setHeader(
      "Cache-Control",
      "s-maxage=3600, stale-while-revalidate=86400"
    );

    return res.end(xml);

  } catch (error) {

    res.statusCode = 500;

    return res.end(
      `Mart sitemap error: ${
        String(error.message || error)
      }`
    );
  }
};
