"use strict";

const SUPABASE_URL =
  "https://dcysjuxyjqtvkihdsjvv.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_RZBX7u1v8MLBCfEJT0-eRg_jPcIulG2";

const SITE_ORIGIN =
  "https://www.wooriapt.app";

const ROWS_PER_SITEMAP = 5000;


module.exports = async function handler(req, res) {

  if (req.method !== "GET") {
    return res
      .status(405)
      .send("Method Not Allowed");
  }

  try {

    const response = await fetch(
      SUPABASE_URL +
        "/rest/v1/safe_apartments?select=단지명",
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization:
            "Bearer " + SUPABASE_KEY,
          Prefer: "count=exact",
          Range: "0-0"
        }
      }
    );

    if (!response.ok) {
      return res
        .status(502)
        .send("Sitemap count error");
    }

    const contentRange =
      response.headers.get("content-range") ||
      "0/0";

    const totalCount =
      Number(
        contentRange.split("/").pop()
      ) || 0;

    const pages =
      Math.max(
        1,
        Math.ceil(
          totalCount /
          ROWS_PER_SITEMAP
        )
      );

    let sitemapItems = "";

    // 1. 주요 서비스 랜딩페이지 (메인 안심거래, 공인중개사 랜딩, 마트 랜딩, 지도)
    sitemapItems +=
      "<sitemap><loc>" +
      SITE_ORIGIN +
      "/pages-sitemap.xml</loc></sitemap>";

    // 2. 안심거래 아파트 자동검색 (총 21,437건 분할)
    for (
      let page = 1;
      page <= pages;
      page += 1
    ) {
      sitemapItems +=
        "<sitemap><loc>" +
        SITE_ORIGIN +
        "/sitemaps/apartments-" +
        page +
        ".xml</loc></sitemap>";
    }

    // 3. 공인중개사 자동검색
    sitemapItems +=
      "<sitemap><loc>" +
      SITE_ORIGIN +
      "/broker-sitemap.xml</loc></sitemap>";

    // 4. 마트 자동검색 (총 6개 분할)
    for (
      let m = 1;
      m <= 6;
      m += 1
    ) {
      sitemapItems +=
        "<sitemap><loc>" +
        SITE_ORIGIN +
        "/sitemaps/marts-" +
        m +
        ".xml</loc></sitemap>";
    }

    res.setHeader(
      "Content-Type",
      "application/xml; charset=utf-8"
    );

    res.setHeader(
      "Cache-Control",
      "s-maxage=86400, stale-while-revalidate=604800"
    );

    return res.status(200).send(
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      sitemapItems +
      "</sitemapindex>"
    );

  } catch (error) {

    console.error(
      "SITEMAP INDEX ERROR:",
      error
    );

    return res
      .status(500)
      .send("Sitemap error");
  }
};
