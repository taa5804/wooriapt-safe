const SUPABASE_URL =
  "https://dcysjuxyjqtvkihdsjvv.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_RZBX7u1v8MLBCfEJT0-eRg_jPcIulG2";

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


  const query =
    new URLSearchParams();


  query.set(
    "select",
    "시도,시군구,읍면,동리,단지명,관리사무소 연락처 주소,latitude,longitude"
  );


  query.set(
    "order",
    "시도.asc,시군구.asc,읍면.asc,동리.asc,단지명.asc"
  );


  if (
    searchTokens.length === 1
  ) {
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


  if (
    searchTokens.length > 1
  ) {
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


      return res
        .status(502)
        .json({
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
        function(
          item,
          index
        ) {
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
              item[
                "관리사무소 연락처 주소"
              ] || "",

            latitude:
              Number(
                item["latitude"]
              ),

            longitude:
              Number(
                item["longitude"]
              )
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


    for (
      const row of rows
    ) {
      const region =
        clean(
          row["시도"]
        );

      const city =
        clean(
          row["시군구"]
        );

      const place =
        clean(
          row["동리"] ||
          row["읍면"]
        );

      const apartment =
        clean(
          row["단지명"]
        );


      if (
        !region ||
        !city ||
        !place
      ) {
        continue;
      }


      for (
        const type
        of tradeTypes
      ) {
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
        .map(
          function(url) {
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
          }
        )
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
   아파트 자동검색 페이지
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


  if (apartment) {
    query.set(
      "select",
      "*"
    );
  } else {
    query.set(
      "select",
      "시도,시군구,읍면,동리,단지명"
    );
  }


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
              apartment
                ? "0-20"
                : "0-999"
          }
        }
      );


    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "APT PAGE DB ERROR:",
        errorText
      );

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
        .map(pathEncode)
        .join("/");


    const apartmentRow =
      apartment
        ? rows[0]
        : null;


    const householdCount =
      firstValue(
        apartmentRow,
        [
          "세대수",
          "총세대수",
          "총 세대수"
        ]
      );


    const completionDate =
      firstValue(
        apartmentRow,
        [
          "준공년월",
          "준공일",
          "사용승인일",
          "사용검사일",
          "건축년도",
          "건축연도"
        ]
      );


    const roadAddress =
      firstValue(
        apartmentRow,
        [
          "도로명주소",
          "도로명 주소",
          "관리사무소 연락처 주소",
          "관리사무소주소",
          "주소"
        ]
      );


    const jibunAddress =
      firstValue(
        apartmentRow,
        [
          "지번주소",
          "지번 주소",
          "법정동주소"
        ]
      );


    const totalBuilding =
      firstValue(
        apartmentRow,
        [
          "동수",
          "총동수",
          "총 동수"
        ]
      );


    const parking =
      firstValue(
        apartmentRow,
        [
          "주차대수",
          "총주차대수",
          "총 주차대수"
        ]
      );


    const heating =
      firstValue(
        apartmentRow,
        [
          "난방방식",
          "난방 방식",
          "난방"
        ]
      );


    const constructor =
      firstValue(
        apartmentRow,
        [
          "시공사",
          "건설사"
        ]
      );


    const managementPhone =
      firstValue(
        apartmentRow,
        [
          "관리사무소 연락처",
          "관리사무소전화번호",
          "관리사무소 전화번호",
          "관리사무소전화"
        ]
      );


    const latitude =
      Number(
        firstValue(
          apartmentRow,
          [
            "latitude",
            "위도"
          ]
        )
      );


    const longitude =
      Number(
        firstValue(
          apartmentRow,
          [
            "longitude",
            "경도"
          ]
        )
      );


    let title = "";

    if (apartment) {
      title =
        location +
        " " +
        apartment +
        " " +
        trade;

      if (householdCount) {
        title +=
          " | " +
          householdCount +
          "세대";
      }

      title +=
        " | 우리아파트";

    } else {
      title =
        location +
        " 아파트 " +
        trade +
        " | 우리아파트";
    }


    const descriptionParts = [];


    if (apartment) {
      descriptionParts.push(
        location +
        " " +
        apartment +
        " " +
        trade +
        " 정보."
      );


      if (householdCount) {
        descriptionParts.push(
          "총 " +
          householdCount +
          "세대."
        );
      }


      if (completionDate) {
        descriptionParts.push(
          "준공 " +
          completionDate +
          "."
        );
      }


      if (roadAddress) {
        descriptionParts.push(
          "주소 " +
          roadAddress +
          "."
        );
      }


      descriptionParts.push(
        "희망조건을 등록하면 공인중개사의 맞춤 매물 제안을 받을 수 있습니다."
      );


      descriptionParts.push(
        "플랫폼 서비스 이용료 50%로 아파트 거래비용을 절약할 수 있습니다."
      );

    } else {
      descriptionParts.push(
        location +
        " 아파트 " +
        trade +
        " 정보를 확인하세요."
      );


      descriptionParts.push(
        "원하는 아파트와 희망조건을 등록하면 공인중개사의 맞춤 매물 제안을 받을 수 있습니다."
      );


      descriptionParts.push(
        "플랫폼 서비스 이용료 50%로 아파트 거래비용을 절약할 수 있습니다."
      );
    }


    const description =
      descriptionParts
        .join(" ")
        .slice(0, 300);


    let detailHtml = "";


    if (apartmentRow) {
      const details =
        apartmentDetails(
          apartmentRow
        );


      if (details.length) {
        detailHtml =
          details
            .map(
              function(item) {
                return `
                  <div class="detail-row">
                    <div class="detail-label">
                      ${html(item.key)}
                    </div>

                    <div class="detail-value">
                      ${html(item.value)}
                    </div>
                  </div>
                `;
              }
            )
            .join("");
      }
    }


    let list = "";


    if (!apartment) {
      const apartmentSet =
        new Set();


      rows.forEach(
        function(row) {
          const name =
            clean(
              row["단지명"]
            );

          if (name) {
            apartmentSet.add(name);
          }
        }
      );


      list =
        Array.from(
          apartmentSet
        )
          .sort(
            function(a, b) {
              return a.localeCompare(
                b,
                "ko"
              );
            }
          )
          .map(
            function(name) {
              const url =
                SITE_ORIGIN +
                "/apt-search/" +
                [
                  region,
                  city,
                  place,
                  name,
                  type
                ]
                  .map(pathEncode)
                  .join("/");


              return `
                <li>
                  <a href="${html(url)}">
                    ${html(name)}
                    ${html(trade)}
                  </a>
                </li>
              `;
            }
          )
          .join("");
    }


    const tradeLinks =
      [
        {
          type: "sale",
          name: "매매"
        },
        {
          type: "jeonse",
          name: "전세"
        },
        {
          type: "monthly",
          name: "월세"
        }
      ]
        .map(
          function(item) {
            const url =
              SITE_ORIGIN +
              "/apt-search/" +
              (
                apartment
                  ? [
                      region,
                      city,
                      place,
                      apartment,
                      item.type
                    ]
                  : [
                      region,
                      city,
                      place,
                      item.type
                    ]
              )
                .map(pathEncode)
                .join("/");


            return `
              <a
                class="${
                  type === item.type
                    ? "active"
                    : ""
                }"
                href="${html(url)}"
              >
                ${html(item.name)}
              </a>
            `;
          }
        )
        .join("");


    let structuredData = null;


    if (apartment) {
      structuredData = {
        "@context":
          "https://schema.org",

        "@type":
          "Place",

        name:
          apartment,

        url:
          canonical
      };


      if (roadAddress) {
        structuredData.address = {
          "@type":
            "PostalAddress",

          streetAddress:
            roadAddress,

          addressLocality:
            city,

          addressRegion:
            region,

          addressCountry:
            "KR"
        };
      }


      if (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude !== 0 &&
        longitude !== 0
      ) {
        structuredData.geo = {
          "@type":
            "GeoCoordinates",

          latitude:
            latitude,

          longitude:
            longitude
        };
      }


      if (managementPhone) {
        structuredData.telephone =
          managementPhone;
      }


      const properties =
        apartmentDetails(
          apartmentRow
        )
          .map(
            function(item) {
              return {
                "@type":
                  "PropertyValue",

                name:
                  item.key,

                value:
                  item.value
              };
            }
          );


      if (properties.length) {
        structuredData.additionalProperty =
          properties;
      }
    }


    res.setHeader(
      "Content-Type",
      "text/html; charset=utf-8"
    );


    res.setHeader(
      "Cache-Control",
      "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400"
    );


    return res
      .status(200)
      .send(`<!doctype html>
<html lang="ko">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1,viewport-fit=cover"
>

<title>${html(title)}</title>

<meta
  name="description"
  content="${html(description)}"
>

<meta
  name="robots"
  content="index,follow,max-image-preview:large"
>

<link
  rel="canonical"
  href="${html(canonical)}"
>

<meta
  property="og:type"
  content="website"
>

<meta
  property="og:title"
  content="${html(title)}"
>

<meta
  property="og:description"
  content="${html(description)}"
>

<meta
  property="og:url"
  content="${html(canonical)}"
>


${
  structuredData
    ? `
<script type="application/ld+json">
${JSON.stringify(structuredData)}
</script>
`
    : ""
}


<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #f5f7f6;
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
  width: 100%;
  max-width: 820px;
  margin: 0 auto;
  padding: 18px 14px 60px;
}


.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}


.brand {
  color: #173a59;
  font-size: 20px;
  font-weight: 900;
  text-decoration: none;
}


.brand strong {
  color: #075b32;
}


.home {
  flex: 0 0 auto;
  padding: 9px 12px;
  border: 1px solid #d8e1dc;
  border-radius: 10px;
  background: #fff;
  color: #425d4e;
  font-weight: 800;
  text-decoration: none;
}


.hero {
  overflow: hidden;
  border: 1px solid #dce5df;
  border-radius: 20px;
  background: #fff;

  box-shadow:
    0 7px 22px
    rgba(22, 56, 42, .07);
}
.hero-top {
  padding: 30px 22px;

  background:
    linear-gradient(
      135deg,
      #075b32,
      #14824b
    );

  color: #fff;
}


.location {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 700;
  opacity: .9;
}


h1 {
  margin: 0;
  font-size: 29px;
  line-height: 1.4;
}


.subtitle {
  margin: 14px 0 0;
  font-size: 17px;
  line-height: 1.75;
}


.body {
  padding: 24px 20px 28px;
}


.trade-links {
  display: grid;
  grid-template-columns:
    repeat(3, 1fr);

  gap: 8px;
  margin-bottom: 24px;
}


.trade-links a {
  padding: 12px 8px;
  border: 1px solid #d9e4de;
  border-radius: 10px;
  background: #fff;
  color: #456052;
  font-weight: 800;
  text-align: center;
  text-decoration: none;
}


.trade-links a.active {
  border-color: #075b32;
  background: #075b32;
  color: #fff;
}


.info-box {
  margin-bottom: 22px;
  padding: 18px;
  border: 1px solid #dce8e1;
  border-radius: 14px;
  background: #f7fbf8;
}


.info-box h2 {
  margin: 0 0 10px;
  font-size: 20px;
}


.info-box p {
  margin: 7px 0;
  color: #52695d;
  line-height: 1.75;
}


.point {
  color: #075b32;
  font-weight: 900;
}


.details {
  margin-top: 26px;
}


.details h2 {
  margin: 0 0 14px;
  font-size: 22px;
}


.detail-table {
  overflow: hidden;
  border: 1px solid #dfe6e2;
  border-radius: 13px;
}


.detail-row {
  display: grid;

  grid-template-columns:
    minmax(110px, 34%)
    1fr;

  border-bottom:
    1px solid #edf1ef;
}


.detail-row:last-child {
  border-bottom: 0;
}


.detail-label {
  padding: 13px 12px;
  background: #f7f9f8;
  color: #53675c;
  font-size: 14px;
  font-weight: 800;
}


.detail-value {
  padding: 13px 12px;
  background: #fff;
  color: #24382d;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}


.cta-box {
  margin-top: 27px;
  padding: 21px 18px;
  border-radius: 15px;
  background: #f3f8f5;
}


.cta-box h2 {
  margin: 0 0 9px;
  font-size: 21px;
}


.cta-box p {
  margin: 0;
  color: #52695d;
  line-height: 1.8;
}


.cta {
  display: flex;
  align-items: center;
  justify-content: center;

  min-height: 57px;
  margin-top: 18px;
  padding: 13px;

  border-radius: 12px;
  background: #075b32;
  color: #fff;

  font-size: 17px;
  font-weight: 900;
  text-decoration: none;
}


.list {
  margin-top: 20px;
  padding: 22px 18px;
  border: 1px solid #dce5df;
  border-radius: 18px;
  background: #fff;
}


.list h2 {
  margin: 0 0 16px;
  font-size: 21px;
}


.list ul {
  margin: 0;
  padding: 0;
  list-style: none;
}


.list li {
  border-bottom:
    1px solid #edf1ef;
}


.list li:last-child {
  border-bottom: 0;
}


.list a {
  display: block;
  padding: 13px 5px;
  color: #264c37;
  font-weight: 700;
  text-decoration: none;
}


.footer {
  margin-top: 24px;
  color: #82928a;
  font-size: 11px;
  line-height: 1.8;
  text-align: center;
}


@media(max-width: 520px) {

  h1 {
    font-size: 25px;
  }


  .hero-top {
    padding: 25px 17px;
  }


  .body {
    padding: 21px 15px 25px;
  }


  .detail-row {
    grid-template-columns:
      115px 1fr;
  }


  .detail-label,
  .detail-value {
    padding: 12px 9px;
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

  <div class="location">
    ${html(location)}
  </div>


  <h1>
    ${
      apartment
        ? html(
            apartment +
            " " +
            trade
          )
        : html(
            place +
            " 아파트 " +
            trade
          )
    }
  </h1>


  <p class="subtitle">
    원하는 아파트, 직접 찾아다니지 마세요.<br>
    희망조건만 등록하세요.
  </p>

</section>


<section class="body">


<div class="trade-links">
  ${tradeLinks}
</div>


<div class="info-box">

  <h2>
    ${
      apartment
        ? html(apartment) +
          " 안심거래"
        : html(location) +
          " 아파트 안심거래"
    }
  </h2>


  <p class="point">
    플랫폼 서비스 이용료 50%로
    아파트 거래비용을 절약할 수 있습니다.
  </p>


  <p>
    매수자·임차인이 원하는 지역,
    아파트, 거래유형과 희망조건을 등록하면
    공인중개사가 조건에 맞는 매물을 제안합니다.
  </p>


  <p>
    매매·전세·월세 모두 이용할 수 있으며
    전자계약을 통한 안전하고 편리한
    거래를 지원합니다.
  </p>

</div>


${
  apartment && detailHtml
    ? `
      <section class="details">

        <h2>
          ${html(apartment)} 단지정보
        </h2>

        <div class="detail-table">
          ${detailHtml}
        </div>

      </section>
    `
    : ""
}


<div class="cta-box">

  <h2>
    원하는 조건의 매물을 제안받으세요
  </h2>


  <p>
    희망조건을 등록하면
    지역 공인중개사가
    조건에 맞는 매물을 제안합니다.
  </p>


  <a
    class="cta"
    href="/apt.html"
  >
    매수 아파트 등록하기
  </a>

</div>


</section>

</main>


${
  apartment
    ? `
      <section class="list">

        <h2>
          ${html(place)}
          다른 아파트도 확인하세요
        </h2>

        <a
          href="${
            html(
              SITE_ORIGIN +
              "/apt-search/" +
              [
                region,
                city,
                place,
                type
              ]
                .map(pathEncode)
                .join("/")
            )
          }"
        >
          ${html(place)}
          아파트
          ${html(trade)}
          전체보기
        </a>

      </section>
    `
    : `
      <section class="list">

        <h2>
          ${html(place)}
          아파트 목록
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
   공인중개사 agent_directory 조회
========================================= */

async function getBrokerRows(
  region,
  city,
  place
) {
  const query =
    new URLSearchParams();


  query.set(
    "select",
    "*"
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


  if (place) {
    query.set(
      "읍면동",
      "eq." + place
    );
  }


  query.set(
    "limit",
    "100"
  );


  const response =
    await fetch(
      SUPABASE_URL +
      "/rest/v1/agent_directory?" +
      query.toString(),
      {
        method: "GET",

        headers: {
          apikey:
            SUPABASE_KEY,

          Authorization:
            "Bearer " +
            SUPABASE_KEY,

          Accept:
            "application/json"
        }
      }
    );


  if (!response.ok) {
    const fallback =
      new URLSearchParams();


    fallback.set(
      "select",
      "*"
    );


    if (region) {
      fallback.set(
        "시도",
        "eq." + region
      );
    }


    if (city) {
      fallback.set(
        "시군구",
        "eq." + city
      );
    }


    fallback.set(
      "limit",
      "300"
    );


    const fallbackResponse =
      await fetch(
        SUPABASE_URL +
        "/rest/v1/agent_directory?" +
        fallback.toString(),
        {
          method: "GET",

          headers: {
            apikey:
              SUPABASE_KEY,

            Authorization:
              "Bearer " +
              SUPABASE_KEY,

            Accept:
              "application/json"
          }
        }
      );


    if (!fallbackResponse.ok) {
      const errorText =
        await fallbackResponse.text();


      console.error(
        "AGENT DIRECTORY ERROR:",
        errorText
      );


      return [];
    }


    const fallbackRows =
      await fallbackResponse.json();


    return fallbackRows
      .filter(
        function(row) {
          const locationText =
            [
              firstValue(
                row,
                [
                  "읍면동",
                  "동리",
                  "읍면",
                  "동",
                  "법정동"
                ]
              ),

              firstValue(
                row,
                [
                  "도로명주소",
                  "도로명 주소",
                  "지번주소",
                  "지번 주소",
                  "주소"
                ]
              )
            ]
              .filter(Boolean)
              .join(" ");


          return (
            !place ||
            locationText.includes(place)
          );
        }
      )
      .slice(0, 100);
  }


  return await response.json();
}


/* =========================================
   중개사 실제 컬럼 읽기
========================================= */

function brokerData(row) {
  const name =
    firstValue(
      row,
      [
        "상호명",
        "업소명",
        "중개업소명",
        "사무소명",
        "중개사무소명",
        "상호"
      ]
    );


  const roadAddress =
    firstValue(
      row,
      [
        "도로명주소",
        "도로명 주소",
        "사업장도로명주소"
      ]
    );


  const jibunAddress =
    firstValue(
      row,
      [
        "지번주소",
        "지번 주소",
        "주소",
        "사업장소재지"
      ]
    );


  const zipcode =
    firstValue(
      row,
      [
        "우편번호",
        "우편 번호"
      ]
    );


  const phone1 =
    firstValue(
      row,
      [
        "전화번호 1",
        "전화번호1",
        "전화번호",
        "대표전화",
        "대표전화번호"
      ]
    );


  const phone2 =
    firstValue(
      row,
      [
        "전화번호 2",
        "전화번호2",
        "추가전화번호"
      ]
    );


  const homepageRaw =
    firstValue(
      row,
      [
        "홈페이지",
        "homepage",
        "website",
        "url",
        "URL"
      ]
    );


  const homepage =
    safeUrl(
      homepageRaw
    );


  const businessType =
    firstValue(
      row,
      [
        "업종명",
        "업종",
        "업태"
      ]
    );


  const representative =
    firstValue(
      row,
      [
        "대표자명",
        "대표자"
      ]
    );


  return {
    name:
      name,

    roadAddress:
      roadAddress,

    jibunAddress:
      jibunAddress,

    zipcode:
      zipcode,

    phone1:
      phone1,

    phone2:
      phone2,

    homepage:
      homepage,

    businessType:
      businessType,

    representative:
      representative
  };
}


/* =========================================
   공인중개사 자동검색 페이지
   agent_directory 실제 DB 사용
========================================= */

async function handleBrokerPage(
  req,
  res
) {
  const region =
    clean(req.query.region);

  const city =
    clean(req.query.city);

  const place =
    clean(req.query.place);


  if (
    !region ||
    !city ||
    !place
  ) {
    return res
      .status(404)
      .send(
        "페이지를 찾을 수 없습니다."
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
      .map(pathEncode)
      .join("/");


  try {
    const rows =
      await getBrokerRows(
        region,
        city,
        place
      );


    const brokers =
      Array.isArray(rows)
        ? rows
            .map(brokerData)
            .filter(
              function(item) {
                return !!item.name;
              }
            )
        : [];


    const brokerCount =
      brokers.length;


    const homepageCount =
      brokers.filter(
        function(item) {
          return !!item.homepage;
        }
      ).length;


    const title =
      location +
      " 공인중개사" +
      (
        brokerCount
          ? " " +
            brokerCount +
            "곳"
          : ""
      ) +
      " | 우리아파트 안심거래";


    const description =
      (
        location +
        " 공인중개사 정보를 확인하세요. " +
        (
          brokerCount
            ? "등록된 중개업소 " +
              brokerCount +
              "곳의 "
            : ""
        )
      );
            ) +
        "상호명, 주소, 전화번호" +
        (
          homepageCount
            ? ", 홈페이지"
            : ""
        ) +
        " 정보를 확인할 수 있습니다. " +
        "공인중개사는 매수자·임차인의 희망조건을 확인하고 맞춤 매물을 제안할 수 있습니다."
      ).slice(
        0,
        300
      );


    let brokerListHtml = "";


    if (brokers.length) {
      brokerListHtml =
        brokers
          .map(
            function(
              broker,
              index
            ) {
              const address =
                broker.roadAddress ||
                broker.jibunAddress;


              let homepageHtml = "";


              if (broker.homepage) {
                homepageHtml = `
                  <a
                    class="broker-homepage"
                    href="${html(broker.homepage)}"
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                  >
                    홈페이지·블로그 보기
                  </a>
                `;
              }


              let phoneHtml = "";


              if (
                broker.phone1 ||
                broker.phone2
              ) {
                phoneHtml = `
                  <div class="broker-row">

                    <div class="broker-label">
                      전화
                    </div>

                    <div class="broker-value">
                      ${
                        broker.phone1
                          ? html(
                              broker.phone1
                            )
                          : ""
                      }

                      ${
                        broker.phone1 &&
                        broker.phone2
                          ? "<br>"
                          : ""
                      }

                      ${
                        broker.phone2
                          ? html(
                              broker.phone2
                            )
                          : ""
                      }
                    </div>

                  </div>
                `;
              }


              return `
                <article class="broker-card">

                  <div class="broker-number">
                    ${index + 1}
                  </div>


                  <h3>
                    ${html(broker.name)}
                  </h3>


                  ${
                    broker.businessType
                      ? `
                        <div class="broker-type">
                          ${html(
                            broker.businessType
                          )}
                        </div>
                      `
                      : ""
                  }


                  ${
                    address
                      ? `
                        <div class="broker-row">

                          <div class="broker-label">
                            주소
                          </div>

                          <div class="broker-value">
                            ${html(address)}
                          </div>

                        </div>
                      `
                      : ""
                  }


                  ${
                    broker.jibunAddress &&
                    broker.roadAddress &&
                    broker.jibunAddress !==
                      broker.roadAddress
                      ? `
                        <div class="broker-row">

                          <div class="broker-label">
                            지번
                          </div>

                          <div class="broker-value">
                            ${html(
                              broker.jibunAddress
                            )}
                          </div>

                        </div>
                      `
                      : ""
                  }


                  ${
                    broker.zipcode
                      ? `
                        <div class="broker-row">

                          <div class="broker-label">
                            우편번호
                          </div>

                          <div class="broker-value">
                            ${html(
                              broker.zipcode
                            )}
                          </div>

                        </div>
                      `
                      : ""
                  }


                  ${phoneHtml}


                  ${
                    broker.representative
                      ? `
                        <div class="broker-row">

                          <div class="broker-label">
                            대표자
                          </div>

                          <div class="broker-value">
                            ${html(
                              broker.representative
                            )}
                          </div>

                        </div>
                      `
                      : ""
                  }


                  ${homepageHtml}

                </article>
              `;
            }
          )
          .join("");

    } else {
      brokerListHtml = `
        <div class="empty">

          현재 ${html(location)}에서
          표시할 수 있는 공인중개사 상세정보를
          찾지 못했습니다.

        </div>
      `;
    }


    const itemList =
      brokers
        .slice(0, 100)
        .map(
          function(
            broker,
            index
          ) {
            const item = {
              "@type":
                "LocalBusiness",

              name:
                broker.name
            };


            const address =
              broker.roadAddress ||
              broker.jibunAddress;


            if (address) {
              item.address = {
                "@type":
                  "PostalAddress",

                streetAddress:
                  address,

                addressLocality:
                  city,

                addressRegion:
                  region,

                postalCode:
                  broker.zipcode || undefined,

                addressCountry:
                  "KR"
              };
            }


            if (broker.phone1) {
              item.telephone =
                broker.phone1;
            }


            if (broker.homepage) {
              item.sameAs = [
                broker.homepage
              ];
            }


            return {
              "@type":
                "ListItem",

              position:
                index + 1,

              item:
                item
            };
          }
        );


    const structuredData = {
      "@context":
        "https://schema.org",

      "@type":
        "ItemList",

      name:
        location +
        " 공인중개사",

      url:
        canonical,

      numberOfItems:
        brokerCount,

      itemListElement:
        itemList
    };


    res.setHeader(
      "Content-Type",
      "text/html; charset=utf-8"
    );


    res.setHeader(
      "Cache-Control",
      "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400"
    );


    return res
      .status(200)
      .send(`<!doctype html>

<html lang="ko">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1,viewport-fit=cover"
>

<title>${html(title)}</title>

<meta
  name="description"
  content="${html(description)}"
>

<meta
  name="robots"
  content="index,follow,max-image-preview:large"
>

<link
  rel="canonical"
  href="${html(canonical)}"
>


<meta
  property="og:type"
  content="website"
>

<meta
  property="og:title"
  content="${html(title)}"
>

<meta
  property="og:description"
  content="${html(description)}"
>

<meta
  property="og:url"
  content="${html(canonical)}"
>


<script type="application/ld+json">
${JSON.stringify(structuredData)}
</script>


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
  width: 100%;
  max-width: 850px;
  margin: auto;
  padding: 18px 14px 60px;
}


.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
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


.location {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 700;
  opacity: .9;
}


h1 {
  margin: 0;
  font-size: 29px;
  line-height: 1.4;
}


.subtitle {
  margin: 13px 0 0;
  line-height: 1.75;
}


.body {
  padding: 24px 20px 28px;
}


.summary {
  margin-bottom: 23px;
  padding: 17px;
  border: 1px solid #dce7ef;
  border-radius: 13px;
  background: #f7fafd;
}


.summary strong {
  color: #1165d7;
}


.summary p {
  margin: 5px 0;
  color: #536b7d;
  line-height: 1.7;
}


.broker-section {
  margin-top: 25px;
}


.broker-section h2 {
  margin: 0 0 14px;
  font-size: 22px;
}


.broker-card {
  position: relative;

  margin-bottom: 13px;
  padding: 19px 17px;

  border: 1px solid #dce5ec;
  border-radius: 14px;

  background: #fff;
}


.broker-number {
  position: absolute;
  top: 18px;
  right: 17px;

  min-width: 27px;
  height: 27px;

  padding: 4px 7px;

  border-radius: 50px;

  background: #eef5fc;
  color: #1165d7;

  font-size: 12px;
  font-weight: 900;
  text-align: center;
}


.broker-card h3 {
  margin: 0 45px 6px 0;
  font-size: 19px;
}


.broker-type {
  margin-bottom: 12px;
  color: #738596;
  font-size: 13px;
}


.broker-row {
  display: grid;

  grid-template-columns:
    75px 1fr;

  gap: 8px;

  margin-top: 8px;

  font-size: 14px;
  line-height: 1.6;
}


.broker-label {
  color: #748696;
  font-weight: 800;
}


.broker-value {
  color: #334c60;
  word-break: break-word;
}


.broker-homepage {
  display: inline-flex;

  align-items: center;
  justify-content: center;

  margin-top: 15px;
  padding: 10px 14px;

  border: 1px solid #1165d7;
  border-radius: 9px;

  color: #1165d7;
  background: #fff;

  font-size: 14px;
  font-weight: 900;

  text-decoration: none;
}


.broker-homepage:hover {
  background: #f1f7fd;
}


.empty {
  padding: 25px 17px;

  border: 1px solid #dce5ec;
  border-radius: 13px;

  background: #f8fafc;

  color: #64788a;
  line-height: 1.7;
}


.join-box {
  margin-top: 28px;
  padding: 22px 18px;

  border-radius: 15px;

  background: #f1f7fd;
}


.join-box h2 {
  margin: 0 0 10px;
  font-size: 21px;
}


.join-box p {
  margin: 7px 0;

  color: #536b7d;
  line-height: 1.75;
}


.cta {
  display: flex;

  align-items: center;
  justify-content: center;

  min-height: 57px;

  margin-top: 18px;
  padding: 13px;

  border-radius: 12px;

  background: #1165d7;
  color: #fff;

  font-size: 17px;
  font-weight: 900;

  text-decoration: none;
}


.footer {
  margin-top: 24px;

  color: #82929e;

  font-size: 11px;
  line-height: 1.8;

  text-align: center;
}


@media(max-width:520px) {

  h1 {
    font-size: 25px;
  }


  .hero-top {
    padding: 25px 17px;
  }


  .body {
    padding: 21px 15px 25px;
  }


  .broker-row {
    grid-template-columns:
      65px 1fr;
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

  <div class="location">
    ${html(location)}
  </div>


  <h1>
    ${html(place)} 공인중개사
  </h1>


  <p class="subtitle">
    우리동네 공인중개사 정보를 확인하고<br>
    매수자·임차인에게 맞춤 매물을 제안하세요.
  </p>

</section>


<section class="body">


<div class="summary">

  <p>
    <strong>
      ${html(location)}
    </strong>
    공인중개사 정보를 확인할 수 있습니다.
  </p>


  ${
    brokerCount
      ? `
        <p>
          현재 이 페이지에서
          <strong>
            ${brokerCount}개 중개업소
          </strong>
          정보를 확인할 수 있습니다.
        </p>
      `
      : ""
  }


  ${
    homepageCount
      ? `
        <p>
          이 중
          <strong>
            ${homepageCount}개 중개업소
          </strong>
          는 등록된 홈페이지·블로그 등의
          링크도 확인할 수 있습니다.
        </p>
      `
      : ""
  }

</div>


<section class="broker-section">

  <h2>
    ${html(place)} 공인중개사 목록
  </h2>


  ${brokerListHtml}

</section>


<div class="join-box">

  <h2>
    공인중개사이신가요?
  </h2>


  <p>
    전국 매수자·임차인의
    희망조건을 확인하고
    조건에 맞는 매물을 제안할 수 있습니다.
  </p>


  <p>
    회원 공인중개사는
    고객 연결을 우선적으로 받을 수 있습니다.
  </p>


  <a
    class="cta"
    href="/broker-landing.html"
  >
    공인중개사 플랫폼 알아보기
  </a>

</div>


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


  } catch (error) {

    console.error(
      "BROKER PAGE ERROR:",
      error
    );


    return res
      .status(500)
      .send(
        "공인중개사 페이지를 불러오는 중 오류가 발생했습니다."
      );
  }
}


/* =========================================
   공인중개사 사이트맵
   기존 URL 구조 유지
========================================= */

async function handleBrokerSitemap(
  req,
  res
) {
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


      rows.push(
        ...batch
      );


      if (
        batch.length < 1000
      ) {
        break;
      }
    }


    const locationSet =
      new Set();


    for (
      const row of rows
    ) {
      const region =
        clean(
          row["시도"]
        );


      const city =
        clean(
          row["시군구"]
        );


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
    return handleApartmentList(
      req,
      res
    );
  }


  /* 아파트 사이트맵 인덱스 */

  if (
    mode === "sitemap-index"
  ) {
    return handleSitemapIndex(
      req,
      res
    );
  }


  /* 아파트 분할 사이트맵 */

  if (
    mode === "sitemap"
  ) {
    return handleSitemap(
      req,
      res
    );
  }


  /* 기본 = 아파트 자동검색 페이지 */

  return handleApartmentPage(
    req,
    res
  );
}
