/* =========================================
   공인중개사 자동검색 페이지
========================================= */

async function handleBrokerPage(req, res) {
  const region = clean(req.query.region);
  const city = clean(req.query.city);
  const place = clean(req.query.place);

  if (!region || !city || !place) {
    return res
      .status(404)
      .send("페이지를 찾을 수 없습니다.");
  }

  const location = [
    region,
    city,
    place
  ]
    .filter(Boolean)
    .join(" ");

  const subject =
    location + " 공인중개사";

  const canonical =
    SITE_ORIGIN +
    "/broker-search/" +
    [
      region,
      city,
      place
    ]
      .map(pathEncode)
      .join("/");

  const description =
    location +
    " 공인중개사를 찾고 계신가요? " +
    "우리아파트 안심거래에서 전국 매수자·임차인의 " +
    "희망조건을 확인하고 맞춤 매물을 제안할 수 있습니다.";

  res.setHeader(
    "Content-Type",
    "text/html; charset=utf-8"
  );

  res.setHeader(
    "Cache-Control",
    "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800"
  );

  return res.status(200).send(`<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>

<title>${html(subject)} | 우리아파트 안심거래</title>

<meta
  name="description"
  content="${html(description)}"
>

<meta
  name="robots"
  content="index,follow"
>

<link
  rel="canonical"
  href="${html(canonical)}"
>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #f4f7fa;
  color: #172b3d;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    "Noto Sans KR",
    Arial,
    sans-serif;
}

.wrap {
  max-width: 760px;
  margin: auto;
  padding: 18px 14px 55px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.brand {
  color: #173a59;
  font-size: 20px;
  font-weight: 900;
  text-decoration: none;
}

.brand strong {
  color: #1165d7;
}

.home {
  padding: 9px 12px;
  border: 1px solid #d4e0e8;
  border-radius: 10px;
  background: #fff;
  color: #456177;
  font-weight: 800;
  text-decoration: none;
}

.hero {
  overflow: hidden;
  border: 1px solid #dce5ec;
  border-radius: 20px;
  background: #fff;
  box-shadow:
    0 7px 22px
    rgba(22, 56, 83, .07);
}

.hero-top {
  padding: 30px 22px;
  background:
    linear-gradient(
      135deg,
      #0f5fcf,
      #2381e7
    );
  color: #fff;
}

h1 {
  margin: 0;
  font-size: 30px;
  line-height: 1.4;
}

.subtitle {
  margin: 13px 0 0;
  line-height: 1.7;
}

.body {
  padding: 25px 20px 28px;
}

.body h2 {
  font-size: 20px;
}

.body p {
  color: #536b7d;
  line-height: 1.8;
}

.cta {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 57px;
  margin-top: 20px;
  border-radius: 12px;
  background: #1165d7;
  color: #fff;
  font-size: 17px;
  font-weight: 900;
  text-decoration: none;
}

.footer {
  margin-top: 22px;
  color: #82929e;
  font-size: 11px;
  line-height: 1.7;
  text-align: center;
}

@media(max-width: 480px) {
  h1 {
    font-size: 25px;
  }

  .hero-top {
    padding: 25px 17px;
  }

  .body {
    padding: 21px 15px 24px;
  }
}
</style>
</head>

<body>

<div class="wrap">

  <header class="header">

    <a
      class="brand"
      href="/"
    >
      🏠 우리아파트
      <strong>안심거래</strong>
    </a>

    <a
      class="home"
      href="/"
    >
      홈으로
    </a>

  </header>


  <main class="hero">

    <section class="hero-top">

      <div>
        ${html(location)}
      </div>

      <h1>
        ${html(subject)}
      </h1>

      <p class="subtitle">
        매수자·임차인의 희망조건을 확인하고
        맞춤 매물을 제안하세요.
      </p>

    </section>


    <section class="body">

      <h2>
        ${html(location)} 공인중개사
      </h2>

      <p>
        ${html(description)}
      </p>

      <p>
        매매·전세·월세 희망조건을 확인하고
        조건에 맞는 매물을 제안할 수 있습니다.
      </p>

      <a
        class="cta"
        href="/broker-landing.html"
      >
        공인중개사 플랫폼 알아보기
      </a>

    </section>

  </main>


  <footer class="footer">

    <div>
      업체명: 에너젠51　|　대표자: 장수용
    </div>

    <div>
      사업자등록번호: 410-27-88141
    </div>

    <div>
      © 우리아파트 안심거래
    </div>

  </footer>

</div>

</body>
</html>`);
}


/* =========================================
   공인중개사 사이트맵
========================================= */

async function handleBrokerSitemap(req, res) {
  res.setHeader(
    "Content-Type",
    "application/xml; charset=utf-8"
  );

  res.setHeader(
    "Cache-Control",
    "s-maxage=86400, stale-while-revalidate=604800"
  );

  try {
    const query =
      new URLSearchParams();

    query.set(
      "select",
      "시도,시군구,읍면,동리"
    );

    query.set(
      "order",
      "시도.asc,시군구.asc,읍면.asc,동리.asc"
    );

    const apiUrl =
      SUPABASE_URL +
      "/rest/v1/safe_apartments?" +
      query.toString();

    const rows = [];

    for (
      let start = 0;
      start < 100000;
      start += 1000
    ) {
      const response =
        await fetch(
          apiUrl,
          {
            method: "GET",

            headers: {
              apikey:
                SUPABASE_KEY,

              Authorization:
                "Bearer " +
                SUPABASE_KEY,

              Range:
                start +
                "-" +
                (start + 999)
            }
          }
        );

      if (!response.ok) {
        throw new Error(
          "Broker sitemap DB error"
        );
      }

      const batch =
        await response.json();

      rows.push(...batch);

      if (batch.length < 1000) {
        break;
      }
    }

    const locationSet =
      new Set();

    for (const row of rows) {
      const region =
        clean(row["시도"]);

      const city =
        clean(row["시군구"]);

      const place =
        clean(
          row["동리"] ||
          row["읍면"]
        );

      if (
        !region ||
        !city ||
        !place
      ) {
        continue;
      }

      locationSet.add(
        [
          region,
          city,
          place
        ].join("|")
      );
    }

    const lastmod =
      new Date()
        .toISOString()
        .split("T")[0];

    const urls = [];

    urls.push(
      "  <url>" +
      "<loc>" +
      xmlEscape(
        SITE_ORIGIN +
        "/broker-landing.html"
      ) +
      "</loc>" +
      "<lastmod>" +
      lastmod +
      "</lastmod>" +
      "<changefreq>weekly</changefreq>" +
      "<priority>0.9</priority>" +
      "</url>"
    );

    for (
      const locationKey
      of locationSet
    ) {
      const parts =
        locationKey.split("|");

      const url =
        SITE_ORIGIN +
        "/broker-search/" +
        parts
          .map(pathEncode)
          .join("/");

      urls.push(
        "  <url>" +
        "<loc>" +
        xmlEscape(url) +
        "</loc>" +
        "<lastmod>" +
        lastmod +
        "</lastmod>" +
        "<changefreq>weekly</changefreq>" +
        "<priority>0.8</priority>" +
        "</url>"
      );
    }

    return res
      .status(200)
      .send(
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
        urls.join("") +
        "</urlset>"
      );

  } catch (error) {
    console.error(
      "BROKER SITEMAP ERROR:",
      error
    );

    return res
      .status(500)
      .send(
        "Broker sitemap generation failed."
      );
  }
}
