const SUPABASE_URL =
  "https://dcysjuxyjqtvkihdsjvv.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_RZBX7u1v8MLBCfEJT0-eRg_jPcIulG2";

const SITE_ORIGIN =
  "https://www.wooriapt.app";


function clean(value) {
  return String(value || "")
    .trim()
    .slice(0, 100);
}


function html(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


function typeName(type) {
  if (type === "jeonse") {
    return "전세";
  }

  if (type === "monthly") {
    return "월세";
  }

  return "매매";
}


function addPlaceFilter(query, place) {
  const tokens =
    clean(place)
      .split(/\s+/)
      .map(function(token) {
        return token.replace(
          /[(),.*]/g,
          ""
        );
      })
      .filter(Boolean)
      .slice(0, 3);


  if (tokens.length === 1) {
    query.set(
      "or",
      "(" +
      "읍면.eq." +
      tokens[0] +
      "," +
      "동리.eq." +
      tokens[0] +
      ")"
    );
  }


  if (tokens.length > 1) {
    query.set(
      "and",
      "(" +
      tokens
        .map(function(token) {
          return (
            "or(" +
            "읍면.eq." +
            token +
            "," +
            "동리.eq." +
            token +
            ")"
          );
        })
        .join(",") +
      ")"
    );
  }
}


export default async function handler(
  req,
  res
) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .send("Method Not Allowed");
  }


  const region =
    clean(req.query.region);

  const city =
    clean(req.query.city);

  const place =
    clean(req.query.place);

  const apartment =
    clean(req.query.apartment);


  const type =
    [
      "sale",
      "jeonse",
      "monthly"
    ].includes(req.query.type)
      ? req.query.type
      : "sale";


  if (!place) {
    return res
      .status(404)
      .send(
        "페이지를 찾을 수 없습니다."
      );
  }


  const query =
    new URLSearchParams();


  query.set(
    "select",
    "시도,시군구,읍면,동리,단지명"
  );


  query.set(
    "order",
    "단지명.asc"
  );


  if (region) {
    query.set(
      "시도",
      "eq." + region
    );
  }


  if (city) {
    query.set(
      "시군구",
      "eq." + city
    );
  }


  if (apartment) {
    query.set(
      "단지명",
      "eq." + apartment
    );
  }


  addPlaceFilter(
    query,
    place
  );


  try {
    const response =
      await fetch(
        SUPABASE_URL +
        "/rest/v1/safe_apartments?" +
        query.toString(),
        {
          headers: {
            apikey:
              SUPABASE_KEY,

            Authorization:
              "Bearer " +
              SUPABASE_KEY,

            Accept:
              "application/json",

            Range:
              "0-999"
          }
        }
      );


    if (!response.ok) {
      return res
        .status(502)
        .send(
          "아파트 정보를 불러오지 못했습니다."
        );
    }


    const rows =
      await response.json();


    if (
      !Array.isArray(rows) ||
      rows.length === 0
    ) {
      return res
        .status(404)
        .send(
          "등록된 아파트 정보를 찾을 수 없습니다."
        );
    }


    const trade =
      typeName(type);


    const location =
      [
        region,
        city,
        place
      ]
        .filter(Boolean)
        .join(" ");


    const subject =
      [
        location,
        apartment || "아파트",
        trade
      ]
        .filter(Boolean)
        .join(" ");


    const canonical =
      SITE_ORIGIN +
      "/apt-search/" +
      (
        apartment
          ? [
              region,
              city,
              place,
              apartment,
              type
            ]
          : [
              region,
              city,
              place,
              type
            ]
      )
        .map(encodeURIComponent)
        .join("/");


    const description =
      apartment
        ? subject +
          " 정보를 확인하고 우리아파트 안심거래에서 공인중개사의 맞춤 매물 제안을 받아보세요."
        : subject +
          "를 찾고 계신가요? 해당 지역의 아파트를 확인하고 안심거래 서비스를 알아보세요.";


    const apartmentNames =
      Array.from(
        new Set(
          rows
            .map(function(row) {
              return clean(
                row["단지명"]
              );
            })
            .filter(Boolean)
        )
      );


    const list =
      apartmentNames
        .slice(0, 100)
        .map(function(name) {
          const url =
            "/apt-search/" +
            [
              region,
              city,
              place,
              name,
              type
            ]
              .map(
                encodeURIComponent
              )
              .join("/");


          return (
            '<li><a href="' +
            url +
            '">' +
            html(
              place +
              " " +
              name +
              " " +
              trade
            ) +
            "</a></li>"
          );
        })
        .join("");


    res.setHeader(
      "Content-Type",
      "text/html; charset=utf-8"
    );


    res.setHeader(
      "Cache-Control",
      "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800"
    );


    return res
      .status(200)
      .send(`<!doctype html>
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

.list {
  margin-top: 18px;
  padding: 18px;
  border: 1px solid #e0e8ee;
  border-radius: 13px;
  background: #fff;
}

.list ul {
  margin: 10px 0 0;
  padding-left: 20px;
}

.list li {
  margin: 9px 0;
}

.list a {
  color: #0b58bd;
  font-weight: 700;
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
        원하는 아파트, 직접 찾아다니지 마세요.
      </p>

    </section>


    <section class="body">

      <h2>
        ${html(subject)} 찾기
      </h2>

      <p>
        ${html(description)}
      </p>

      <p>
        희망조건을 등록하면 해당 지역 공인중개사가
        조건에 맞는 매물을 제안합니다.
      </p>

      <a
        class="cta"
        href="/"
      >
        매수 아파트 등록하기
      </a>

    </section>

  </main>


  ${
    apartment
      ? ""
      : `
        <section class="list">

          <h2>
            ${html(place)} 아파트 목록
          </h2>

          <ul>
            ${list}
          </ul>

        </section>
      `
  }


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

  } catch (error) {

    console.error(
      "APT PAGE ERROR:",
      error
    );

    return res
      .status(500)
      .send(
        "페이지를 불러오는 중 오류가 발생했습니다."
      );
  }
}
