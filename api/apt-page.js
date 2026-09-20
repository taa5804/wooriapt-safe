const SUPABASE_URL =
  "https://dcysjuxyjqtvkihdsjvv.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_RZBX7u1v8MLBCfEJT0-eRg_jPcIulG2";

const SITE_ORIGIN =
  "https://www.wooriapt.app";

const SITEMAP_PAGE_SIZE = 5000;


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


function xmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}


function pathEncode(value) {
  return encodeURIComponent(
    String(value || "").trim()
  );
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


/* =========================================
   아파트 목록 API
========================================= */

async function handleApartmentList(
  req,
  res
) {
  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );

  res.setHeader(
    "Cache-Control",
    "s-maxage=3600, stale-while-revalidate=86400"
  );


  const pageNo =
    Math.max(
      1,
      parseInt(
        req.query.pageNo || "1",
        10
      )
    );


  const requestedRows =
    parseInt(
      req.query.numOfRows || "1000",
      10
    );


  const numOfRows =
    Math.min(
      Math.max(
        requestedRows,
        1
      ),
      1000
    );


  const offset =
    (pageNo - 1) *
    numOfRows;


  const end =
    offset +
    numOfRows -
    1;


  const rawKeyword =
    String(
      req.query.q || ""
    ).trim();


  const searchKeyword =
    rawKeyword
      .replace(
        /매매|전세|월세|아파트/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  const searchTokens =
    searchKeyword
      .split(" ")
      .map(function(token) {
        return token
          .replace(
            /[(),.*]/g,
            ""
          )
          .trim();
      })
      .filter(function(token) {
        return token.length >= 2;
      })
      .slice(0, 5);


  const isMapRequest =
    String(
      req.query.map || ""
    ).trim() === "1";


  const minLat =
    Number(req.query.minLat);

  const maxLat =
    Number(req.query.maxLat);

  const minLng =
    Number(req.query.minLng);

  const maxLng =
    Number(req.query.maxLng);


  const mapBoundsValid =
    isMapRequest &&
    Number.isFinite(minLat) &&
    Number.isFinite(maxLat) &&
    Number.isFinite(minLng) &&
    Number.isFinite(maxLng) &&
    minLat <= maxLat &&
    minLng <= maxLng;


  if (
    isMapRequest &&
    !mapBoundsValid
  ) {
    return res.status(400).json({
      ok: false,
      message:
        "지도 영역 좌표가 올바르지 않습니다."
    });
  }


  const query =
    new URLSearchParams();


  if (mapBoundsValid) {

    /*
      지도 요청은 현재 화면 영역의
      좌표가 있는 아파트만 조회한다.
      전국 아파트 전체를 불러오지 않는다.
    */

    query.set(
      "select",
      "시도,시군구,읍면,동리,단지명,관리사무소 연락처,latitude,longitude"
    );


    query.set(
      "latitude",
      "gte." + minLat
    );


    query.append(
      "latitude",
      "lte." + maxLat
    );


    query.set(
      "longitude",
      "gte." + minLng
    );


    query.append(
      "longitude",
      "lte." + maxLng
    );


    query.set(
      "order",
      "단지명.asc"
    );

  } else {

    query.set(
      "select",
      "시도,시군구,읍면,동리,단지명"
    );


    query.set(
      "order",
      "시도.asc,시군구.asc,읍면.asc,동리.asc,단지명.asc"
    );

  }


  if (searchTokens.length === 1) {
    const token =
      searchTokens[0];


    query.set(
      "or",
      "(" +
      [
        "시도",
        "시군구",
        "읍면",
        "동리",
        "단지명"
      ]
        .map(function(column) {
          return (
            column +
            ".ilike.*" +
            token +
            "*"
          );
        })
        .join(",") +
      ")"
    );
  }


  if (searchTokens.length > 1) {
    const tokenFilters =
      searchTokens.map(
        function(token) {
          return (
            "or(" +
            [
              "시도",
              "시군구",
              "읍면",
              "동리",
              "단지명"
            ]
              .map(
                function(column) {
                  return (
                    column +
                    ".ilike.*" +
                    token +
                    "*"
                  );
                }
              )
              .join(",") +
            ")"
          );
        }
      );


    query.set(
      "and",
      "(" +
      tokenFilters.join(",") +
      ")"
    );
  }


  const apiUrl =
    SUPABASE_URL +
    "/rest/v1/safe_apartments?" +
    query.toString();


  try {
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

            Accept:
              "application/json",

            Prefer:
              "count=exact",

            Range:
              offset +
              "-" +
              end
          }
        }
      );


    if (!response.ok) {
      const errorText =
        await response.text();


      console.error(
        "SUPABASE APT LIST ERROR:",
        errorText
      );


      return res.status(502).json({
        ok: false,

        message:
          "아파트 목록을 불러오지 못했습니다.",

        status:
          response.status
      });
    }


    const data =
      await response.json();


    const contentRange =
      response.headers.get(
        "content-range"
      ) || "";


    let totalCount =
      data.length;


    if (
      contentRange &&
      contentRange.includes("/")
    ) {
      const total =
        contentRange
          .split("/")
          .pop();


      if (
        total &&
        total !== "*"
      ) {
        const parsed =
          Number(total);


        if (
          Number.isFinite(parsed)
        ) {
          totalCount =
            parsed;
        }
      }
    }


    const apartments =
      data.map(
        function(item, index) {

          const eupmyeon =
            item["읍면"] || "";

          const dongri =
            item["동리"] || "";


          return {
            kaptCode:
              String(
                offset +
                index +
                1
              ),

            kaptName:
              item["단지명"] || "",

            bjdCode:
              "",

            region:
              item["시도"] || "",

            city:
              item["시군구"] || "",

            dong:
              [
                eupmyeon,
                dongri
              ]
                .filter(Boolean)
                .join(" "),

            detail:
              dongri ||
              eupmyeon ||
              "",

            address:
              item["관리사무소 연락처"] || "",

            latitude:
              Number(item["latitude"]),

            longitude:
              Number(item["longitude"])
          };
        }
      );


    return res
      .status(200)
      .json({
        ok: true,

        pageNo:
          pageNo,

        numOfRows:
          numOfRows,

        totalCount:
          totalCount,

        count:
          apartments.length,

        apartments:
          apartments
      });

  } catch (error) {

    console.error(
      "SAFE APARTMENTS API ERROR:",
      error
    );


    return res
      .status(500)
      .json({
        ok: false,

        message:
          "아파트 데이터를 불러오는 중 오류가 발생했습니다."
      });
  }
}


/* =========================================
   아파트 사이트맵 인덱스
========================================= */

async function handleSitemapIndex(
  req,
  res
) {
  try {
    const response =
      await fetch(
        SUPABASE_URL +
        "/rest/v1/safe_apartments?select=단지명",
        {
          headers: {
            apikey:
              SUPABASE_KEY,

            Authorization:
              "Bearer " +
              SUPABASE_KEY,

            Prefer:
              "count=exact",

            Range:
              "0-0"
          }
        }
      );


    if (!response.ok) {
      return res
        .status(502)
        .send(
          "Sitemap count error"
        );
    }


    const contentRange =
      response.headers.get(
        "content-range"
      ) || "0/0";


    const totalCount =
      Number(
        contentRange
          .split("/")
          .pop()
      ) || 0;


    const pages =
      Math.max(
        1,
        Math.ceil(
          totalCount /
          SITEMAP_PAGE_SIZE
        )
      );


    let sitemapItems = "";


    for (
      let page = 1;
      page <= pages;
      page += 1
    ) {
      sitemapItems +=
        "<sitemap>" +
          "<loc>" +
            SITE_ORIGIN +
            "/sitemaps/apartments-" +
            page +
            ".xml" +
          "</loc>" +
        "</sitemap>";
    }


    res.setHeader(
      "Content-Type",
      "application/xml; charset=utf-8"
    );


    res.setHeader(
      "Cache-Control",
      "s-maxage=86400, stale-while-revalidate=604800"
    );


    return res
      .status(200)
      .send(
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
        sitemapItems +
        "</sitemapindex>"
      );

  } catch (error) {

    console.error(
      "APT SITEMAP INDEX ERROR:",
      error
    );


    return res
      .status(500)
      .send(
        "Sitemap error"
      );
  }
}
/* =========================================
   아파트 개별 사이트맵
========================================= */

async function handleSitemap(
  req,
  res
) {
  res.setHeader(
    "Content-Type",
    "application/xml; charset=utf-8"
  );

  res.setHeader(
    "Cache-Control",
    "s-maxage=3600, stale-while-revalidate=86400"
  );


  try {
    const page =
      Math.max(
        1,
        parseInt(
          req.query.page || "1",
          10
        )
      );


    const start =
      (page - 1) *
      SITEMAP_PAGE_SIZE;


    const end =
      start +
      SITEMAP_PAGE_SIZE -
      1;


    const query =
      new URLSearchParams();


    query.set(
      "select",
      "시도,시군구,읍면,동리,단지명"
    );


    query.set(
      "order",
      "시도.asc,시군구.asc,동리.asc,단지명.asc"
    );


    const apiUrl =
      SUPABASE_URL +
      "/rest/v1/safe_apartments?" +
      query.toString();


    const rows = [];


    for (
      let batchStart = start;
      batchStart <= end;
      batchStart += 1000
    ) {
      const batchEnd =
        Math.min(
          batchStart + 999,
          end
        );


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
                batchStart +
                "-" +
                batchEnd,

              Prefer:
                "count=exact"
            }
          }
        );


      if (!response.ok) {
        const message =
          await response.text();


        throw new Error(
          "Supabase request failed: " +
          response.status +
          " " +
          message
        );
      }


      const batchRows =
        await response.json();


      rows.push(
        ...batchRows
      );


      if (
        batchRows.length < 1000
      ) {
        break;
      }
    }


    const urlSet =
      new Set();


    if (page === 1) {
      urlSet.add(
        SITE_ORIGIN +
        "/broker-landing.html"
      );
    }


    const tradeTypes =
      [
        "sale",
        "jeonse",
        "monthly"
      ];


    for (const row of rows) {
      const region =
        String(
          row["시도"] || ""
        ).trim();


      const city =
        String(
          row["시군구"] || ""
        ).trim();


      const place =
        String(
          row["동리"] ||
          row["읍면"] ||
          ""
        ).trim();


      const apartment =
        String(
          row["단지명"] || ""
        ).trim();


      if (
        !region ||
        !city ||
        !place
      ) {
        continue;
      }


      for (const type of tradeTypes) {
        const regionPath =
          "/apt-search/" +
          pathEncode(region) +
          "/" +
          pathEncode(city) +
          "/" +
          pathEncode(place) +
          "/" +
          type;


        urlSet.add(
          SITE_ORIGIN +
          regionPath
        );


        if (apartment) {
          const apartmentPath =
            "/apt-search/" +
            pathEncode(region) +
            "/" +
            pathEncode(city) +
            "/" +
            pathEncode(place) +
            "/" +
            pathEncode(apartment) +
            "/" +
            type;


          urlSet.add(
            SITE_ORIGIN +
            apartmentPath
          );
        }
      }
    }


    const lastmod =
      new Date()
        .toISOString()
        .split("T")[0];


    const urls =
      Array.from(urlSet)
        .map(function(url) {
          return [
            "  <url>",
            "    <loc>" +
              xmlEscape(url) +
              "</loc>",
            "    <lastmod>" +
              lastmod +
              "</lastmod>",
            "    <changefreq>weekly</changefreq>",
            "    <priority>0.8</priority>",
            "  </url>"
          ].join("\n");
        })
        .join("\n");


    const xml =
      [
        '<?xml version="1.0" encoding="UTF-8"?>',

        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',

        urls,

        "</urlset>"
      ].join("\n");


    return res
      .status(200)
      .send(xml);

  } catch (error) {

    console.error(
      "APT SITEMAP ERROR:",
      error
    );


    return res
      .status(500)
      .send(
        "Sitemap generation failed."
      );
  }
}


/* =========================================
   아파트 자동 검색페이지
========================================= */

async function handleApartmentPage(
  req,
  res
) {
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
        href="/apt.html"
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


/* =========================================
   통합 진입점
========================================= */

export default async function handler(
  req,
  res
) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .send(
        "Method Not Allowed"
      );
  }


  const mode =
    String(
      req.query.mode || "page"
    ).trim();


  if (mode === "broker-page") {
    return handleBrokerPage(
      req,
      res
    );
  }


  if (mode === "broker-sitemap") {
    return handleBrokerSitemap(
      req,
      res
    );
  }


  if (mode === "list") {
    return handleApartmentList(
      req,
      res
    );
  }


  if (mode === "sitemap-index") {
    return handleSitemapIndex(
      req,
      res
    );
  }


  if (mode === "sitemap") {
    return handleSitemap(
      req,
      res
    );
  }


  return handleApartmentPage(
    req,
    res
  );
}
