"use strict";

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

module.exports = async function handler(req, res) {
  const q = req.query || {};

  const mart = String(q.mart || "").trim();
  const region = String(q.region || "").trim();
  const address = String(q.address || "").trim();

  if (!mart) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/html; charset=utf-8");

    return res.end(`
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,follow">
<title>마트 정보를 찾을 수 없습니다</title>
</head>
<body>
<h1>마트 정보를 찾을 수 없습니다.</h1>
</body>
</html>
    `);
  }

  const safeMart = esc(mart);
  const safeRegion = esc(region);
  const safeAddress = esc(address);

  const baseUrl = "https://www.wooriapt.app";

  const pathParts = [
    region,
    mart
  ]
    .filter(Boolean)
    .map(v => encodeURIComponent(v));

  const canonicalUrl =
    `${baseUrl}/mart-search/${pathParts.join("/")}`;

  const title = region
    ? `${safeRegion} ${safeMart} | 마트 정보`
    : `${safeMart} | 마트 정보`;

  const description = address
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

  const html = `
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

  return res.end(html);
};
