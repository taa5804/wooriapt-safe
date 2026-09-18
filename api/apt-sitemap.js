const SUPABASE_URL =
  "https://dcysjuxyjqtvkihdsjvv.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_RZBX7u1v8MLBCfEJT0-eRg_jPcIulG2";

const SITE_ORIGIN =
  "https://www.wooriapt.app";

const ROWS_PER_SITEMAP =
  1000;

const TYPES = [
  "sale",
  "jeonse",
  "monthly"
];


function xml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}


function part(value) {
  return encodeURIComponent(
    String(value || "").trim()
  );
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


  const page =
    Math.max(
      1,
      parseInt(
        req.query.page || "1",
        10
      )
    );


  const offset =
    (page - 1) *
    ROWS_PER_SITEMAP;


  const end =
    offset +
    ROWS_PER_SITEMAP -
    1;


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

            Range:
              offset +
              "-" +
              end
          }
        }
      );


    if (!response.ok) {
      return res
        .status(502)
        .send(
          "Sitemap data error"
        );
    }


    const rows =
      await response.json();


    const urls =
      new Set();


    rows.forEach(
      function(row) {

        const region =
          String(
            row["시도"] || ""
          ).trim();


        const city =
          String(
            row["시군구"] || ""
          ).trim();


        const place =
          [
            row["읍면"],
            row["동리"]
          ]
            .map(function(value) {
              return String(
                value || ""
              ).trim();
            })
            .filter(Boolean)
            .join(" ");


        const apartment =
          String(
            row["단지명"] || ""
          ).trim();


        if (
          !place ||
          !apartment
        ) {
          return;
        }


        TYPES.forEach(
          function(type) {

            /*
              지역형 주소

              예:
              양산동 아파트 매매
            */

            urls.add(
              SITE_ORIGIN +
              "/apt-search/" +
              [
                region,
                city,
                place,
                type
              ]
                .map(part)
                .join("/")
            );


            /*
              단지형 주소

              예:
              양산동 호반아파트 매매
            */

            urls.add(
              SITE_ORIGIN +
              "/apt-search/" +
              [
                region,
                city,
                place,
                apartment,
                type
              ]
                .map(part)
                .join("/")
            );

          }
        );

      }
    );


    const body =
      Array.from(urls)
        .map(function(url) {
          return (
            "<url>" +
              "<loc>" +
                xml(url) +
              "</loc>" +
            "</url>"
          );
        })
        .join("");


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
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
        body +
        "</urlset>"
      );

  } catch (error) {

    console.error(
      "APT SITEMAP ERROR:",
      error
    );


    return res
      .status(500)
      .send(
        "Sitemap error"
      );
  }
}
