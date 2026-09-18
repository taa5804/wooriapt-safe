"use strict";

const BASE_URL = "https://www.wooriapt.app";

/*
  현재 마트 DB 약 16,994개
  사이트맵당 최대 5,000개
  = 4개 사이트맵
*/
const TOTAL_SITEMAPS = 4;

function xmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

module.exports = function handler(req, res) {

  if (req.method !== "GET") {
    res.statusCode = 405;
    return res.end("Method Not Allowed");
  }

  let items = "";

  for (let page = 1; page <= TOTAL_SITEMAPS; page++) {

    const loc =
      `${BASE_URL}/sitemaps/marts-${page}.xml`;

    items += `
  <sitemap>
    <loc>${xmlEscape(loc)}</loc>
  </sitemap>`;
  }

  const xml =
`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</sitemapindex>`;

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
};
