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

const BASE_URL = "https://www.wooriapt.app";

const PAGE_SIZE = 5000;

/*
  mart_directory 현재 약 26,255개
  5,000개씩 나누면 6개 사이트맵 필요
*/
const TOTAL_SITEMAPS = 6;


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
   1. 마트 자동 검색 페이지
========================================= */

function handleMartPage(req, res) {

  const q = req.query || {};

  const region =
    String(q.region || "").trim();

  const city =
    String(q.city || "").trim();

  const place =
    String(q.place || "").trim();

  const mart =
    String(q.mart || "").trim();

  const address =
    String(q.address || "").trim();


  if (!mart) {

    res.statusCode = 404;

    res.setHeader(
      "Content-Type",
      "text/html; charset=utf-8"
    );

    return res.end(
`<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<title>마트 정보를 찾을 수 없습니다</title>
</head>
<body>
<h1>마트 정보를 찾을 수 없습니다.</h1>
</body>
</html>`
    );
  }


  const pathParts = [
    region,
    city,
    place,
    mart
  ]
    .filter(Boolean)
    .map(encodePart);


  const canonical =
    `${BASE_URL}/mart-search/${pathParts.join("/")}`;


  const locationText =
    [region, city, place]
      .filter(Boolean)
      .join(" ");


  const title =
    `${locationText ? locationText + " " : ""}${mart} | 우리아파트 마트 플랫폼`;


  const description =
    `${locationText ? locationText + " " : ""}${mart} 정보를 확인하고 우리아파트 마트 고객유치 플랫폼을 알아보세요.`;


  const structuredData = {
    "@context": "https://schema.org",
    "@type": "GroceryStore",
    "name": mart,
    "address": address || locationText,
    "url": canonical
  };


  const html =
`<!doctype html>
<html lang="ko">
<head>

<meta charset="utf-8">

<meta name="viewport"
content="width=device-width,initial-scale=1,viewport-fit=cover">

<title>${esc(title)}</title>

<meta name="description"
content="${esc(description)}">

<link rel="canonical"
href="${esc(canonical)}">

<meta name="robots"
content="index,follow">

<script type="application/ld+json">
${JSON.stringify(structuredData)}
</script>

<style>

*{
  box-sizing:border-box;
}

body{
  margin:0;
  font-family:
    Arial,
    "Noto Sans KR",
    sans-serif;
  background:#f5f7f6;
  color:#222;
}

.wrap{
  max-width:760px;
  margin:0 auto;
  padding:40px 20px;
}

.card{
  background:#fff;
  border-radius:16px;
  padding:32px 24px;
  box-shadow:
    0 4px 20px rgba(0,0,0,.08);
}

.badge{
  display:inline-block;
  padding:7px 12px;
  border-radius:20px;
  background:#e8f5ee;
  color:#075b32;
  font-size:14px;
  font-weight:700;
  margin-bottom:18px;
}

h1{
  margin:0 0 18px;
  font-size:30px;
  line-height:1.35;
}

.location{
  margin-bottom:10px;
  font-size:17px;
  color:#555;
}

.address{
  margin-bottom:24px;
  font-size:15px;
  color:#777;
}

.desc{
  font-size:17px;
  line-height:1.7;
  margin-bottom:28px;
}

.cta{
  display:block;
  width:100%;
  padding:16px 20px;
  text-align:center;
  text-decoration:none;
  border-radius:10px;
  background:#075b32;
  color:#fff;
  font-size:18px;
  font-weight:700;
}

.cta:hover{
  opacity:.92;
}

</style>

</head>

<body>

<div class="wrap">

  <div class="card">

    <div class="badge">
      우리아파트 마트 플랫폼
    </div>

    <h1>
      ${esc(mart)}
    </h1>

    ${
      locationText
        ? `<div class="location">${esc(locationText)}</div>`
        : ""
    }

    ${
      address
        ? `<div class="address">${esc(address)}</div>`
        : ""
    }

    <div class="desc">
      ${esc(mart)}을 찾으셨나요?<br>
      우리아파트 마트 고객유치 플랫폼을 확인해보세요.
    </div>

    <a
      class="cta"
      href="/mart-landing.html">
      자세히 알아보기
    </a>

  </div>

</div>

</body>
</html>`;


  res.statusCode = 200;

  res.setHeader(
    "Content-Type",
    "text/html; charset=utf-8"
  );

  res.setHeader(
    "Cache-Control",
    "s-maxage=3600, stale-while-revalidate=86400"
  );

  return res.end(html);
}


/* =========================================
   2. 마트 검색 API
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
      "시도,시군구,읍면동,상호명,주소,전화번호"
    );


    params.set(
      "상호명",
      `ilike.*${q}*`
    );


    params.set(
      "order",
      "상호명.asc"
    );


    params.set(
      "limit",
      "50"
    );


    const url =
      `${SUPABASE_URL}/rest/v1/mart_directory?${params.toString()}`;


    const response =
      await fetch(
        url,
        {
          method: "GET",

          headers: {
            apikey: SUPABASE_KEY,

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
        query: q,
        count: rows.length,
        marts: rows
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
            error.message || error
          )
      });
  }
}


/* =========================================
   3. 마트 사이트맵 INDEX
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


    items +=
`
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
   4. 개별 마트 사이트맵
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
    (page - 1) * PAGE_SIZE;


  const to =
    from + PAGE_SIZE - 1;


  try {

    const params =
      new URLSearchParams();


    params.set(
      "select",
      "시도,시군구,읍면동,상호명,주소,전화번호"
    );


    params.set(
      "order",
      "시도.asc,시군구.asc,읍면동.asc,상호명.asc"
    );


    const url =
      `${SUPABASE_URL}/rest/v1/mart_directory?${params.toString()}`;


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

        .filter(
          row =>
            row &&
            row["시도"] &&
            row["시군구"] &&
            row["읍면동"] &&
            row["상호명"]
        )

        .map(
          row => {

            const region =
              encodePart(
                row["시도"]
              );

            const city =
              encodePart(
                row["시군구"]
              );

            const place =
              encodePart(
                row["읍면동"]
              );

            const mart =
              encodePart(
                row["상호명"]
              );


            const loc =
              `${BASE_URL}/mart-search/${region}/${city}/${place}/${mart}`;


            return (
`
  <url>
    <loc>${xmlEscape(loc)}</loc>
  </url>`
            );
          }
        )

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

    const cause =
      error && error.cause
        ? JSON.stringify(error.cause)
        : "no cause";

    return res.end(
      `Mart sitemap error: ${String(error.message || error)} | cause: ${cause}`
    );
  }
}


/* =========================================
   통합 HANDLER
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
      req.query.mode || "mart-page"
    ).trim();


  if (
    mode === "mart-search"
  ) {

    return handleMartSearch(
      req,
      res
    );
  }


  if (
    mode === "mart-sitemap"
  ) {

    return handleMartSitemap(
      req,
      res
    );
  }


  if (
    mode === "mart-sitemap-index"
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
