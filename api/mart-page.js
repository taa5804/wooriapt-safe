"use strict";


/* =========================================
   기본 설정
========================================= */

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  "https://dcysjuxyjqtvkihdsjvv.supabase.co";

const SUPABASE_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY;

const BASE_URL =
  "https://www.wooriapt.app";

const PAGE_SIZE = 5000;

/*
  현재 마트 DB 약 16,994개
  사이트맵당 최대 5,000개
  = 4개 사이트맵
*/
const TOTAL_SITEMAPS = 4;


/* =========================================
   공통 함수
========================================= */

function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


function jsonEsc(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}


function xmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}


function encodePart(value) {
  return encodeURIComponent(
    String(value || "").trim()
  );
}


/* =========================================
   1. 마트 자동검색 페이지
========================================= */

async function handleMartPage(req, res) {

  const q = req.query || {};

  const mart =
    String(q.mart || "").trim();

  const region =
    String(q.region || "").trim();

  const address =
    String(q.address || "").trim();


  if (!mart) {

    res.statusCode = 404;

    res.setHeader(
      "Content-Type",
      "text/html; charset=utf-8"
    );

    return res.end(`
<!doctype html>
<html lang="ko">
<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>

<meta
  name="robots"
  content="noindex,follow"
>

<title>
마트 정보를 찾을 수 없습니다
</title>

</head>

<body>

<h1>
마트 정보를 찾을 수 없습니다.
</h1>

</body>
</html>
    `);
  }


  const safeMart =
    esc(mart);

  const safeRegion =
    esc(region);

  const safeAddress =
    esc(address);


  const pathParts = [
    region,
    mart
  ]
    .filter(Boolean)
    .map(function(v) {
      return encodeURIComponent(v);
    });


  const canonicalUrl =
    `${BASE_URL}/mart-search/${pathParts.join("/")}`;


  const title =
    region
      ? `${safeRegion} ${safeMart} | 마트 정보`
      : `${safeMart} | 마트 정보`;


  const description =
    address
      ? `${safeMart}은(는) ${safeAddress}에 위치한 마트입니다. 매장 정보와 특가·행사상품 안내를 확인하세요.`
      : region
        ? `${safeRegion} ${safeMart}의 매장 정보와 특가·행사상품 안내를 확인하세요.`
        : `${safeMart}의 매장 정보와 특가·행사상품 안내를 확인하세요.`;


  const structuredData = {
    "@context": "https://schema.org",
    "@type": "GroceryStore",
    "name": mart,
    "url": canonicalUrl
  };


  if (address) {

    structuredData.address = {
      "@type": "PostalAddress",
      "streetAddress": address,
      "addressCountry": "KR"
    };
  }


  const pageHtml = `
<!doctype html>
<html lang="ko">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1,viewport-fit=cover"
>

<title>${title}</title>

<meta
  name="description"
  content="${description}"
>

<meta
  name="robots"
  content="index,follow"
>

<link
  rel="canonical"
  href="${canonicalUrl}"
>

<script type="application/ld+json">
${JSON.stringify(structuredData, null, 2)}
</script>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;

  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    "Noto Sans KR",
    Arial,
    sans-serif;

  background: #f7f8f7;
  color: #222;
}

.wrap {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: 24px 16px 50px;
}

.card {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 14px;
  padding: 26px 20px;
}

.label {
  font-size: 14px;
  margin-bottom: 8px;
}

h1 {
  margin: 0 0 18px;
  font-size: 28px;
  line-height: 1.35;
}

.info {
  margin-bottom: 22px;
  padding: 16px;
  background: #f8faf8;
  border-radius: 10px;
}

.info-row {
  font-size: 15px;
  line-height: 1.7;
}

.text {
  font-size: 16px;
  line-height: 1.8;
  margin-bottom: 26px;
}

.owner-box {
  margin-top: 28px;
  padding: 22px 18px;
  border: 1px solid #dfe6df;
  border-radius: 12px;
}

.owner-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 10px;
}

.owner-text {
  font-size: 15px;
  line-height: 1.7;
  margin-bottom: 18px;
}

.button {
  display: block;
  width: 100%;
  padding: 15px 16px;
  text-align: center;
  text-decoration: none;
  border-radius: 9px;
  background: #075b32;
  color: #fff;
  font-size: 17px;
  font-weight: 700;
}

</style>

</head>

<body>

<main class="wrap">

<section class="card">

  <div class="label">
    우리동네 마트 정보
  </div>

  <h1>
    ${safeMart}
  </h1>


  <div class="info">

    ${
      safeRegion
        ? `
        <div class="info-row">
          <strong>지역</strong> : ${safeRegion}
        </div>
        `
        : ""
    }

    ${
      safeAddress
        ? `
        <div class="info-row">
          <strong>주소</strong> : ${safeAddress}
        </div>
        `
        : ""
    }

  </div>


  <div class="text">

    ${
      safeRegion
        ? `${safeRegion}에서 ${safeMart}을(를) 찾고 계신가요?`
        : `${safeMart}을(를) 찾고 계신가요?`
    }

    이 페이지에서 매장 정보를 확인하고,
    등록된 특가상품과 행사상품 정보를 확인할 수 있습니다.

  </div>


  <div class="owner-box">

    <div class="owner-title">
      이 마트의 사장님이신가요?
    </div>

    <div class="owner-text">
      고객이 우리 매장을 검색하고 있습니다.
      매장 정보와 특가·행사상품을 직접 등록해
      고객에게 보여주세요.
    </div>

    <a
      class="button"
      href="/mart-landing.html"
    >
      마트 플랫폼 알아보기
    </a>

  </div>

</section>

</main>

</body>
</html>
  `;


  res.statusCode = 200;

  res.setHeader(
    "Content-Type",
    "text/html; charset=utf-8"
  );

  res.setHeader(
    "Cache-Control",
    "s-maxage=3600, stale-while-revalidate=86400"
  );

  return res.end(pageHtml);
}


/* =========================================
   2. 마트 DB 검색 API
========================================= */

async function handleMartSearch(req, res) {

  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );

  res.setHeader(
    "Cache-Control",
    "s-maxage=3600, stale-while-revalidate=86400"
  );


  if (!SUPABASE_KEY) {

    return res.status(500).json({
      ok: false,
      message:
        "Supabase 환경변수가 설정되지 않았습니다."
    });
  }


  const q =
    String(req.query.q || "").trim();


  if (!q) {

    return res.status(400).json({
      ok: false,
      message:
        "마트 검색어를 입력해주세요."
    });
  }


  try {

    const params =
      new URLSearchParams();


    params.set(
      "select",
      "id,mart_code,mart_name,approval_status,service_status"
    );


    params.set(
      "mart_name",
      `ilike.*${q}*`
    );


    params.set(
      "order",
      "mart_name.asc"
    );


    params.set(
      "limit",
      "50"
    );


    const url =
      `${SUPABASE_URL}/rest/v1/mart_members?${params.toString()}`;


    const response =
      await fetch(
        url,
        {
          method: "GET",

          headers: {
            apikey:
              SUPABASE_KEY,

            Authorization:
              `Bearer ${SUPABASE_KEY}`,

            Accept:
              "application/json"
          }
        }
      );


    if (!response.ok) {

      const errorText =
        await response.text();


      return res
        .status(response.status)
        .json({
          ok: false,

          message:
            "마트 DB 조회에 실패했습니다.",

          error:
            errorText
        });
    }


    const rows =
      await response.json();


    return res
      .status(200)
      .json({
        ok: true,

        query:
          q,

        count:
          rows.length,

        marts:
          rows
      });


  } catch (error) {

    return res
      .status(500)
      .json({
        ok: false,

        message:
          "마트 검색 중 오류가 발생했습니다.",

        error:
          String(
            error.message ||
            error
          )
      });
  }
}


/* =========================================
   3. 마트 사이트맵 인덱스
   /mart-sitemap.xml
========================================= */

function handleMartSitemapIndex(
  req,
  res
) {

  let items = "";


  for (
    let page = 1;
    page <= TOTAL_SITEMAPS;
    page++
  ) {

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
}


/* =========================================
   4. 마트 개별 사이트맵
   /sitemaps/marts-1.xml
   /sitemaps/marts-2.xml
   ...
========================================= */

async function handleMartSitemap(
  req,
  res
) {

  if (!SUPABASE_KEY) {

    res.statusCode = 500;

    return res.end(
      "Supabase environment variable missing"
    );
  }


  const page =
    Math.max(
      1,
      parseInt(
        req.query.page || "1",
        10
      )
    );


  const from =
    (page - 1) *
    PAGE_SIZE;


  const to =
    from +
    PAGE_SIZE -
    1;


  try {

    const params =
      new URLSearchParams();


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


    const response =
      await fetch(
        url,
        {
          method: "GET",

          headers: {
            apikey:
              SUPABASE_KEY,

            Authorization:
              `Bearer ${SUPABASE_KEY}`,

            Accept:
              "application/json",

            Range:
              `${from}-${to}`,

            Prefer:
              "count=exact"
          }
        }
      );


    if (!response.ok) {

      const errorText =
        await response.text();


      res.statusCode =
        response.status;


      return res.end(
        `Mart sitemap DB error: ${errorText}`
      );
    }


    const rows =
      await response.json();


    const urls =
      rows
        .filter(function(row) {
          return (
            row &&
            row.mart_name
          );
        })
        .map(function(row) {

          const martName =
            encodePart(
              row.mart_name
            );


          const martCode =
            encodePart(
              row.mart_code ||
              row.id
            );


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
        String(
          error.message ||
          error
        )
      }`
    );
  }
}


/* =========================================
   통합 진입점
========================================= */

module.exports =
  async function handler(
    req,
    res
  ) {

    if (req.method !== "GET") {

      res.statusCode = 405;

      return res.end(
        "Method Not Allowed"
      );
    }


    const mode =
      String(
        req.query.mode ||
        "page"
      ).trim();


    if (
      mode ===
      "mart-search"
    ) {

      return handleMartSearch(
        req,
        res
      );
    }


    if (
      mode ===
      "mart-sitemap"
    ) {

      return handleMartSitemap(
        req,
        res
      );
    }


    if (
      mode ===
      "mart-sitemap-index"
    ) {

      return handleMartSitemapIndex(
        req,
        res
      );
    }


    return handleMartPage(
      req,
      res
    );
  };
