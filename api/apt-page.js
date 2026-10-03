const SUPABASE_URL =
  "https://wpshlmijsscmlasqtapa.supabase.co";

const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY;

const SITE_ORIGIN =
  "https://www.wooriapt.app";

const SITEMAP_PAGE_SIZE = 5000;


/* =========================================
   NAVER INDEXNOW
========================================= */

const INDEXNOW_KEY =
  "fc1e3ad82010475381daf9846e627fdd";

const INDEXNOW_HOST =
  "www.wooriapt.app";

const INDEXNOW_KEY_LOCATION =
  "https://www.wooriapt.app/fc1e3ad82010475381daf9846e627fdd.txt";


async function submitIndexNow(urls) {

  if (
    typeof urls === "string"
  ) {
    urls = [urls];
  }


  if (
    !Array.isArray(urls) ||
    urls.length === 0
  ) {
    return {
      ok: false,
      error:
        "전송할 URL이 없습니다."
    };
  }


  const validUrls =
    [...new Set(urls)]
      .filter(
        function(url) {
          try {
            const u =
              new URL(url);

            return (
              u.protocol ===
                "https:" &&
              (
                u.hostname ===
                  "wooriapt.app" ||
                u.hostname ===
                  "www.wooriapt.app"
              )
            );

          } catch (error) {
            return false;
          }
        }
      )
      .slice(
        0,
        10000
      );


  if (
    validUrls.length === 0
  ) {
    return {
      ok: false,
      error:
        "유효한 wooriapt.app URL이 없습니다."
    };
  }


  const response =
    await fetch(
      "https://searchadvisor.naver.com/indexnow",
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json; charset=utf-8"
        },

        body:
          JSON.stringify({
            host:
              INDEXNOW_HOST,

            key:
              INDEXNOW_KEY,

            keyLocation:
              INDEXNOW_KEY_LOCATION,

            urlList:
              validUrls
          })
      }
    );


  const responseText =
    await response.text();


  return {
    ok:
      response.ok,

    naverStatus:
      response.status,

    submitted:
      validUrls.length,

    response:
      responseText ||
      "Success"
  };
}


/* =========================================
   공통 함수
========================================= */

function clean(value) {
  return String(value || "")
    .trim()
    .slice(0, 300);
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


function safeUrl(value) {
  const url =
    String(value || "").trim();

  if (!url) {
    return "";
  }

  try {
    const parsed =
      new URL(
        /^https?:\/\//i.test(url)
          ? url
          : "https://" + url
      );

    if (
      parsed.protocol !== "http:" &&
      parsed.protocol !== "https:"
    ) {
      return "";
    }

    return parsed.href;

  } catch (error) {
    return "";
  }
}


function addPlaceFilter(
  query,
  place
) {
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
   실제 DB 행에서 값 찾기
   컬럼명이 조금 달라도 대응
========================================= */

function firstValue(
  row,
  names
) {
  if (!row) {
    return "";
  }

  for (
    const name of names
  ) {
    const value =
      row[name];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value).trim();
    }
  }

  return "";
}


/* =========================================
   아파트 상세정보 출력 대상
========================================= */

function apartmentDetails(row) {
  if (!row) {
    return [];
  }

  const skipKeys =
    new Set([
      "id",
      "created_at",
      "updated_at",
      "latitude",
      "longitude",
      "시도",
      "시군구",
      "읍면",
      "동리",
      "단지명"
    ]);


  const preferred = [
    "도로명주소",
    "지번주소",
    "주소",
    "관리사무소 연락처 주소",
    "관리사무소주소",

    "세대수",
    "총세대수",

    "동수",
    "총동수",

    "최고층",
    "최저층",

    "준공년월",
    "사용승인일",
    "사용검사일",
    "준공일",

    "건축년도",
    "건축연도",

    "난방방식",
    "난방",

    "복도유형",

    "주차대수",
    "총주차대수",

    "시공사",
    "건설사",

    "시행사",

    "관리방식",

    "관리사무소 연락처",
    "관리사무소전화번호",
    "관리사무소전화",

    "관리사무소 팩스",
    "관리사무소팩스",

    "홈페이지",

    "분양형태",

    "전용면적",
    "공급면적",

    "평형",

    "법정동주소",

    "도로명"
  ];


  const result = [];
  const used = new Set();


  preferred.forEach(
    function(key) {
      const value =
        row[key];

      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        result.push({
          key: key,
          value:
            String(value).trim()
        });

        used.add(key);
      }
    }
  );


  Object.keys(row)
    .forEach(
      function(key) {
        if (
          used.has(key) ||
          skipKeys.has(key)
        ) {
          return;
        }

        const value =
          row[key];

        if (
          value === undefined ||
          value === null ||
          String(value).trim() === ""
        ) {
          return;
        }


        /*
         내부 시스템용 컬럼은
         화면에 표시하지 않음
        */

        if (
          /^uuid$/i.test(key) ||
          /password/i.test(key) ||
          /token/i.test(key) ||
          /secret/i.test(key)
        ) {
          return;
        }


        result.push({
          key: key,
          value:
            String(value).trim()
        });

        used.add(key);
      }
    );


  return result;
}


/* =========================================
   아파트 목록 API
========================================= */


/* =========================================
   안심거래 2026-09-18 기준 Supabase
========================================= */

const APT_SUPABASE_URL =
  "https://dcysjuxyjqtvkihdsjvv.supabase.co";

const APT_SUPABASE_KEY =
  "sb_publishable_RZBX7u1v8MLBCfEJT0-eRg_jPcIulG2";


function aptClean(value) {
  return String(value || "")
    .trim()
    .slice(0, 100);
}


function aptHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


function aptXmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}


function aptPathEncode(value) {
  return encodeURIComponent(
    String(value || "").trim()
  );
}


function aptTypeName(type) {
  if (type === "jeonse") {
    return "전세";
  }

  if (type === "monthly") {
    return "월세";
  }

  return "매매";
}


function aptAddPlaceFilter(query, place) {
  const tokens =
    aptClean(place)
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

async function aptHandleApartmentList(
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


  const query =
    new URLSearchParams();


  query.set(
    "select",
    "시도,시군구,읍면,동리,단지명"
  );


  query.set(
    "order",
    "시도.asc,시군구.asc,읍면.asc,동리.asc,단지명.asc"
  );


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
    APT_SUPABASE_URL +
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
              APT_SUPABASE_KEY,

            Authorization:
              "Bearer " +
              APT_SUPABASE_KEY,

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
              ""
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

async function aptHandleSitemapIndex(
  req,
  res
) {
  try {
    const response =
      await fetch(
        APT_SUPABASE_URL +
        "/rest/v1/safe_apartments?select=단지명",
        {
          headers: {
            apikey:
              APT_SUPABASE_KEY,

            Authorization:
              "Bearer " +
              APT_SUPABASE_KEY,

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

async function aptHandleSitemap(
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
      APT_SUPABASE_URL +
      "/rest/v1/safe_apartments?" +
      query.toString();


    const response =
      await fetch(
        apiUrl,
        {
          method: "GET",

          headers: {
            apikey:
              APT_SUPABASE_KEY,

            Authorization:
              "Bearer " +
              APT_SUPABASE_KEY,

            Range:
              start +
              "-" +
              end,

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


    const rows =
      await response.json();


    const urlSet =
      new Set();


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
          aptPathEncode(region) +
          "/" +
          aptPathEncode(city) +
          "/" +
          aptPathEncode(place) +
          "/" +
          type;


        urlSet.add(
          SITE_ORIGIN +
          regionPath
        );


        if (apartment) {
          const apartmentPath =
            "/apt-search/" +
            aptPathEncode(region) +
            "/" +
            aptPathEncode(city) +
            "/" +
            aptPathEncode(place) +
            "/" +
            aptPathEncode(apartment) +
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
              aptXmlEscape(url) +
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

async function aptHandleApartmentPage(
  req,
  res
) {
  const region =
    aptClean(req.query.region);

  const city =
    aptClean(req.query.city);

  const place =
    aptClean(req.query.place);

  const apartment =
    aptClean(req.query.apartment);


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


  aptAddPlaceFilter(
    query,
    place
  );


  try {
    const response =
      await fetch(
        APT_SUPABASE_URL +
        "/rest/v1/safe_apartments?" +
        query.toString(),
        {
          headers: {
            apikey:
              APT_SUPABASE_KEY,

            Authorization:
              "Bearer " +
              APT_SUPABASE_KEY,

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
      aptTypeName(type);


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
              return aptClean(
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
            aptHtml(
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

<title>${aptHtml(subject)} | 우리아파트 안심거래</title>

<meta
  name="description"
  content="${aptHtml(description)}"
>

<meta
  name="robots"
  content="index,follow"
>

<link
  rel="canonical"
  href="${aptHtml(canonical)}"
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
.card {
  background: #ffffff;
  border-radius: 18px;
  padding: 22px;
  margin-bottom: 16px;
  box-shadow:
    0 8px 26px
    rgba(20, 55, 90, 0.08);
}

h1 {
  margin:
    0 0 12px;
  font-size: 27px;
  line-height: 1.4;
  letter-spacing: -0.7px;
}

h2 {
  margin:
    0 0 12px;
  font-size: 21px;
  line-height: 1.45;
}

p {
  margin:
    7px 0;
  line-height: 1.75;
  color: #425466;
}

.hero {
  padding:
    28px 22px;
}

.hero .sub {
  font-size: 16px;
}

.point {
  color: #1165d7;
  font-weight: 900;
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 17px;
}

.badge {
  display: inline-block;
  padding:
    7px 11px;
  border-radius: 999px;
  background: #edf5ff;
  color: #1557a5;
  font-size: 13px;
  font-weight: 800;
}

.cta {
  display: block;
  margin-top: 18px;
  padding: 15px;
  border-radius: 12px;
  background: #1267d6;
  color: #ffffff;
  text-align: center;
  text-decoration: none;
  font-weight: 900;
  font-size: 17px;
}

ul {
  margin:
    10px 0 0;
  padding-left: 20px;
}

li {
  margin:
    8px 0;
  line-height: 1.55;
}

li a {
  color: #174f86;
  text-decoration: none;
}

li a:hover {
  text-decoration: underline;
}

.small {
  font-size: 13px;
  color: #6d7b88;
}

.footer {
  padding:
    10px 4px;
  text-align: center;
  font-size: 12px;
  color: #7c8995;
}

@media (
  max-width: 600px
) {
  h1 {
    font-size: 23px;
  }

  h2 {
    font-size: 19px;
  }

  .card {
    padding: 18px;
  }

  .hero {
    padding:
      23px 18px;
  }
}
</style>
</head>

<body>

<main class="wrap">

  <div class="header">
    <a
      class="brand"
      href="/"
    >
      우리아파트
      <strong>안심거래</strong>
    </a>
  </div>


  <section class="card hero">

    <h1>
      ${aptHtml(subject)}
    </h1>

    <p class="sub">
      원하는 아파트,
      직접 찾아다니지 마세요.
      <span class="point">
        희망조건만 등록하세요.
      </span>
    </p>

    <div class="badges">

      <span class="badge">
        안심거래
      </span>

      <span class="badge">
        플랫폼 서비스 이용료 50%
      </span>

      <span class="badge">
        공인중개사 맞춤 제안
      </span>

    </div>


    <a
      class="cta"
      href="/apt.html"
    >
      매수 아파트 등록하기
    </a>

  </section>


  <section class="card">

    <h2>
      ${aptHtml(location)}
      아파트 ${aptHtml(trade)} 정보
    </h2>


    ${
      apartment
        ? `
          <p>
            <strong>
              ${aptHtml(apartment)}
            </strong>
            단지를 찾는 고객을 위한
            페이지입니다.
          </p>

          <p>
            희망조건을 등록하면
            공인중개사가 조건에 맞는
            매물을 제안할 수 있습니다.
          </p>
        `
        : `
          <p>
            ${aptHtml(place)}에서
            ${aptHtml(trade)} 가능한
            아파트 단지를 확인하세요.
          </p>

          <p>
            아래 단지를 선택하면
            해당 아파트의
            ${aptHtml(trade)} 안내 페이지로
            이동합니다.
          </p>
        `
    }

  </section>


  ${
    !apartment &&
    list
      ? `
        <section class="card">

          <h2>
            ${aptHtml(place)}
            아파트 목록
          </h2>

          <ul>
            ${list}
          </ul>

        </section>
      `
      : ""
  }


  <section class="card">

    <h2>
      우리아파트 안심거래
    </h2>

    <p>
      매수자·임차인이 원하는
      아파트와 거래조건을 등록하면
      공인중개사가 조건에 맞는
      매물을 제안합니다.
    </p>

    <p>
      제안 내용을 비교한 뒤
      원하는 매물을 선택하고
      안전한 절차에 따라
      거래를 진행할 수 있습니다.
    </p>

    <p>
      매수자·임차인은
      <strong>
        플랫폼 서비스 이용료 50%
      </strong>
      혜택을 받을 수 있습니다.
    </p>

  </section>


  <section class="card">

    <h2>
      안전한 아파트 거래
    </h2>

    <p>
      계약 과정에서는
      필요한 서류를 확인하고
      전자계약을 이용합니다.
    </p>

    <p>
      계약금과 중도금은
      필요에 따라
      안전한 거래 절차를
      이용할 수 있습니다.
    </p>

    <p>
      전자계약서를 확인하고
      프린터해서 보관할 수 있습니다.
    </p>

  </section>


  <div class="footer">
    © 우리아파트 안심거래
  </div>

</main>

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
        "페이지 생성 중 오류가 발생했습니다."
      );
  }
}


/* =========================================
   기존 아파트 목록
========================================= */

async function handleApartmentList(
  req,
  res
) {
  return aptHandleApartmentList(
    req,
    res
  );
}


/* =========================================
   기존 아파트 사이트맵 인덱스
========================================= */

async function handleSitemapIndex(
  req,
  res
) {
  return aptHandleSitemapIndex(
    req,
    res
  );
}


/* =========================================
   기존 아파트 분할 사이트맵
========================================= */

async function handleSitemap(
  req,
  res
) {
  return aptHandleSitemap(
    req,
    res
  );
}


/* =========================================
   기존 아파트 자동검색 페이지
========================================= */

async function handleApartmentPage(
  req,
  res
) {
  return aptHandleApartmentPage(
    req,
    res
  );
}


/* =========================================
   공인중개사 자동검색 페이지
========================================= */

async function handleBrokerPage(
  req,
  res
) {

  const region =
    clean(
      req.query.region
    );


  const city =
    clean(
      req.query.city
    );


  const place =
    clean(
      req.query.place
    );


  const broker =
    clean(
      req.query.broker
    );


  if (
    !region ||
    !city ||
    !place
  ) {
    return res
      .status(404)
      .send(
        "지역 정보가 없습니다."
      );
  }


  function buildBrokerQuery(rCol, cCol, pCol) {
    const q = new URLSearchParams();
    q.set("select", "*");
    if (region) {
      q.set(rCol, "eq." + region);
    }
    if (city) {
      q.set(cCol, "eq." + city);
    }
    if (place) {
      q.set(pCol, "eq." + place);
    }
    if (broker) {
      q.set("상호명", "eq." + broker);
    }
    return q.toString();
  }

  try {

    let response =
      await fetch(
        SUPABASE_URL +
          "/rest/v1/agent_directory?" +
          buildBrokerQuery("지역명", "시군구", "동"),
        {
          method:
            "GET",

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

    if (!response.ok && response.status === 400) {
      const fallbackRes =
        await fetch(
          SUPABASE_URL +
            "/rest/v1/agent_directory?" +
            buildBrokerQuery("시도", "시군구", "동리"),
          {
            method:
              "GET",

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

      if (fallbackRes.ok) {
        response = fallbackRes;
      }
    }


    if (!response.ok) {

      const errorText =
        await response.text();


      console.error(
        "BROKER PAGE DB ERROR:",
        errorText
      );


      return res
        .status(response.status)
        .send(
          "공인중개사 정보를 불러오지 못했습니다."
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
          "등록된 공인중개사 정보를 찾을 수 없습니다."
        );
    }


    const location =
      [
        region,
        city,
        place
      ]
        .filter(Boolean)
        .join(" ");


    const canonical =
      SITE_ORIGIN +
      "/broker-search/" +
      [
        region,
        city,
        place
      ]
        .concat(
          broker
            ? [broker]
            : []
        )
        .map(pathEncode)
        .join("/");


    const brokerCount =
      rows.length;


    const title =
      broker
        ? (
            location +
            " " +
            broker +
            " 공인중개사"
          )
        : (
            location +
            " 공인중개사"
          );


    const description =
      broker
        ? (
            location +
            " " +
            broker +
            " 공인중개사 정보입니다. " +
            "우리아파트 안심거래에서 " +
            "아파트 매매·전세·월세 거래 정보를 확인하세요."
          )
        : (
            location +
            " 지역 공인중개사 " +
            brokerCount +
            "곳의 정보를 확인하세요. " +
            "우리아파트 안심거래에서 " +
            "아파트 매매·전세·월세 거래 정보를 확인할 수 있습니다."
          );


    const brokerItems =
      rows
        .slice(
          0,
          100
        )
        .map(
          function(row) {

            const officeName =
              firstValue(
                row,
                [
                  "상호명",
                  "중개사무소명",
                  "사무소명",
                  "업체명"
                ]
              );


            const address =
              firstValue(
                row,
                [
                  "주소",
                  "도로명주소",
                  "소재지"
                ]
              );


            const phone =
              firstValue(
                row,
                [
                  "전화번호",
                  "대표전화",
                  "연락처"
                ]
              );


            const homepage =
              safeUrl(
                firstValue(
                  row,
                  [
                    "홈페이지",
                    "홈페이지URL",
                    "website",
                    "url"
                  ]
                )
              );


            const brokerUrl =
              officeName
                ? (
                    "/broker-search/" +
                    [
                      region,
                      city,
                      place,
                      officeName
                    ]
                      .map(
                        pathEncode
                      )
                      .join("/")
                  )
                : "";


            return `
              <li>
                ${
                  brokerUrl
                    ? (
                        '<a href="' +
                        html(brokerUrl) +
                        '"><strong>' +
                        html(
                          officeName ||
                          "공인중개사"
                        ) +
                        "</strong></a>"
                      )
                    : (
                        "<strong>" +
                        html(
                          officeName ||
                          "공인중개사"
                        ) +
                        "</strong>"
                      )
                }

                ${
                  address
                    ? (
                        "<div>" +
                        html(address) +
                        "</div>"
                      )
                    : ""
                }

                ${
                  phone
                    ? (
                        "<div>전화 " +
                        html(phone) +
                        "</div>"
                      )
                    : ""
                }

                ${
                  homepage
                    ? (
                        '<div><a href="' +
                        html(homepage) +
                        '" rel="nofollow noopener" target="_blank">' +
                        "홈페이지 보기" +
                        "</a></div>"
                      )
                    : ""
                }
              </li>
            `;
          }
        )
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

<title>${html(title)} | 우리아파트 안심거래</title>

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
  box-sizing:
    border-box;
}

body {
  margin: 0;
  background:
    #f4f7fa;
  color:
    #172b3d;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    "Noto Sans KR",
    Arial,
    sans-serif;
}

.wrap {
  max-width:
    760px;
  margin:
    auto;
  padding:
    18px 14px 55px;
}

.card {
  background:
    #ffffff;
  border-radius:
    18px;
  padding:
    22px;
  margin-bottom:
    16px;
  box-shadow:
    0 8px 26px
    rgba(20,55,90,.08);
}

h1 {
  margin:
    0 0 12px;
  font-size:
    27px;
  line-height:
    1.4;
}

h2 {
  font-size:
    21px;
}

p {
  line-height:
    1.7;
  color:
    #425466;
}

ul {
  padding-left:
    22px;
}

li {
  margin:
    14px 0;
  line-height:
    1.6;
}

a {
  color:
    #1557a5;
}

.cta {
  display:
    block;
  margin-top:
    18px;
  padding:
    15px;
  border-radius:
    12px;
  background:
    #1267d6;
  color:
    #ffffff;
  text-align:
    center;
  text-decoration:
    none;
  font-weight:
    900;
}

</style>

</head>

<body>

<main class="wrap">

<section class="card">

<h1>
${html(title)}
</h1>

<p>
${html(description)}
</p>

<a
  class="cta"
  href="/apt.html"
>
매수 아파트 등록하기
</a>

</section>


<section class="card">

<h2>
${html(location)}
공인중개사
</h2>

<ul>
${brokerItems}
</ul>

</section>


</main>

</body>
</html>`);

  } catch (error) {

    console.error(
      "BROKER PAGE ERROR:",
      error
    );


    return res
      .status(500)
      .send(
        "공인중개사 페이지 생성 중 오류가 발생했습니다."
      );
  }
}
/* =========================================
   공인중개사 사이트맵
   기존 URL 구조 유지
========================================= */

/* =========================================
   공인중개사 agent_directory 조회
   지역명 + 시군구 + 동 단위 조회
========================================= */

/* =========================================
   공인중개사 사이트맵
   동 단위 / 최대 4000개
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
    const response = await fetch(
      SUPABASE_URL +
        "/rest/v1/rpc/get_broker_sitemap_locations",
      {
        method: "POST",

        headers: {
          apikey: SUPABASE_KEY,
          Authorization:
            "Bearer " + SUPABASE_KEY,
          "Content-Type":
            "application/json",
          Accept:
            "application/json"
        },

        body: JSON.stringify({})
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        "Broker sitemap DB error: " +
          response.status +
          " " +
          errorText
      );
    }

    const rows =
      await response.json();

    if (!Array.isArray(rows)) {
      throw new Error(
        "Broker sitemap DB result is not an array"
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

    for (const row of rows) {
      const region =
        clean(row.region);

      const city =
        clean(row.city);

      const place =
        clean(row.place);

      if (
        !region ||
        !city ||
        !place
      ) {
        continue;
      }

      const url =
        SITE_ORIGIN +
        "/broker-search/" +
        [
          region,
          city,
          place
        ]
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

    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.join("\n") +
      "\n</urlset>";

    return res
      .status(200)
      .send(xml);

  } catch (error) {
    console.error(
      "BROKER SITEMAP ERROR:",
      error
    );

    return res
      .status(500)
      .send(
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        "<error>broker sitemap generation failed</error>"
      );
  }
}


/* =========================================
   통합 진입점
========================================= */

async function handler(
  req,
  res
) {

  const mode =
    String(
      req.query.mode ||
      "page"
    ).trim();


  /* =========================================
     네이버 IndexNow
  ========================================= */

  if (
    mode === "indexnow"
  ) {

    if (
      req.method !== "POST"
    ) {
      return res
        .status(405)
        .json({
          ok: false,
          error: "Method Not Allowed"
        });
    }

    try {

      let urls =
        req.body?.urls ||
        req.body?.urlList ||
        [];

      if (
        typeof urls === "string"
      ) {
        urls = [urls];
      }

      const result =
        await submitIndexNow(
          urls
        );

      if (
        !result.ok
      ) {
        return res
          .status(
            result.naverStatus ||
            400
          )
          .json(result);
      }

      return res
        .status(200)
        .json(result);

    } catch (error) {

      console.error(
        "INDEXNOW ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          ok: false,
          error:
            error.message ||
            "IndexNow 전송 중 오류가 발생했습니다."
        });
    }
  }


  /* 기존 기능은 GET만 허용 */

  if (
    req.method !== "GET"
  ) {
    return res
      .status(405)
      .send(
        "Method Not Allowed"
      );
  }


  /* 공인중개사 자동검색 */

  if (
    mode === "broker-page"
  ) {
    return handleBrokerPage(
      req,
      res
    );
  }


  /* 공인중개사 사이트맵 */

  if (
    mode === "broker-sitemap"
  ) {
    return handleBrokerSitemap(
      req,
      res
    );
  }


  /* 아파트 목록 */

  if (
    mode === "list"
  ) {
    return aptHandleApartmentList(
      req,
      res
    );
  }


  /* 아파트 사이트맵 인덱스 */

  if (
    mode === "sitemap-index"
  ) {
    return aptHandleSitemapIndex(
      req,
      res
    );
  }


  /* 아파트 분할 사이트맵 */

  if (
    mode === "sitemap"
  ) {
    return aptHandleSitemap(
      req,
      res
    );
  }


  /* 기본 = 아파트 자동검색 페이지 */

  return aptHandleApartmentPage(
    req,
    res
  );
}

module.exports = handler;
