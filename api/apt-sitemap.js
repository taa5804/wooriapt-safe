"use strict";

const SITE_URL = "https://wooriapt.app";
const PAGE_SIZE = 5000;

function xmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function pathEncode(value) {
  return encodeURIComponent(String(value || "").trim());
}

function makeUrl(path) {
  return `${SITE_URL}${path}`;
}

module.exports = async function handler(req, res) {
  res.setHeader(
    "Content-Type",
    "application/xml; charset=utf-8"
  );

  res.setHeader(
    "Cache-Control",
    "s-maxage=3600, stale-while-revalidate=86400"
  );

  if (req.method !== "GET") {
    res.statusCode = 405;
    return res.end("Method Not Allowed");
  }

  try {
    const page = Math.max(
      1,
      parseInt(req.query.page || "1", 10)
    );

    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      res.statusCode = 500;
      return res.end("Supabase environment variables are missing.");
    }

    const apiUrl =
      `${supabaseUrl}/rest/v1/safe_apartments` +
      `?select=${encodeURIComponent("시도,시군구,읍면,동리,단지명")}` +
      `&order=${encodeURIComponent("시도.asc,시군구.asc,동리.asc,단지명.asc")}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Range: `${start}-${end}`,
        Prefer: "count=exact"
      }
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(
        `Supabase request failed: ${response.status} ${message}`
      );
    }

    const rows = await response.json();
    const urlSet = new Set();
    const tradeTypes = ["sale", "jeonse", "monthly"];

    for (const row of rows) {
      const region = String(row["시도"] || "").trim();
      const city = String(row["시군구"] || "").trim();
      const place = String(
        row["동리"] || row["읍면"] || ""
      ).trim();
      const apartment = String(row["단지명"] || "").trim();

      if (!region || !city || !place) {
        continue;
      }

      for (const type of tradeTypes) {
        const regionPath =
          `/apt-search/${pathEncode(region)}` +
          `/${pathEncode(city)}` +
          `/${pathEncode(place)}` +
          `/${type}`;

        urlSet.add(makeUrl(regionPath));

        if (apartment) {
          const apartmentPath =
            `/apt-search/${pathEncode(region)}` +
            `/${pathEncode(city)}` +
            `/${pathEncode(place)}` +
            `/${pathEncode(apartment)}` +
            `/${type}`;

          urlSet.add(makeUrl(apartmentPath));
        }
      }
    }

    const lastmod = new Date().toISOString().split("T")[0];

    const urls = Array.from(urlSet)
      .map((url) => {
        return [
          "  <url>",
          `    <loc>${xmlEscape(url)}</loc>`,
          `    <lastmod>${lastmod}</lastmod>`,
          "    <changefreq>weekly</changefreq>",
          "    <priority>0.8</priority>",
          "  </url>"
        ].join("\n");
      })
      .join("\n");

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      urls,
      "</urlset>"
    ].join("\n");

    res.statusCode = 200;
    return res.end(xml);
  } catch (error) {
    console.error("apt-sitemap error:", error);

    res.statusCode = 500;
    return res.end("Sitemap generation failed.");
  }
};
