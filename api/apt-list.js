export default async function handler(req, res) {
  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );

  res.setHeader(
    "Cache-Control",
    "s-maxage=3600, stale-while-revalidate=86400"
  );

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      message: "GET 요청만 사용할 수 있습니다."
    });
  }

  const SUPABASE_URL =
    "https://dcysjuxyjqtvkihdsjvv.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_RZBX7u1v8MLBCfEJT0-eRg_jPcIulG2";

  const pageNo = Math.max(
    1,
    parseInt(req.query.pageNo || "1", 10)
  );

  const requestedRows = parseInt(
    req.query.numOfRows || "1000",
    10
  );

  const numOfRows = Math.min(
    Math.max(requestedRows, 1),
    1000
  );

  const offset = (pageNo - 1) * numOfRows;
  const end = offset + numOfRows - 1;

  /*
    검색어에서 거래유형과
    일반적인 '아파트' 문구를 제외합니다.

    예:
    양산동 아파트 매매 → 양산동
    양산동 호반아파트 매매 → 양산동 호반
  */

  const rawKeyword =
    String(req.query.q || "").trim();

  const searchKeyword = rawKeyword
    .replace(/매매|전세|월세|아파트/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  /*
    지역명과 단지명을 각각 검색할 수 있도록
    검색어를 단어별로 분리합니다.
  */

  const searchTokens = searchKeyword
    .split(" ")
    .map(function(token) {
      return token
        .replace(/[(),.*]/g, "")
        .trim();
    })
    .filter(function(token) {
      return token.length >= 2;
    })
    .slice(0, 5);

  const query = new URLSearchParams();

  query.set(
    "select",
    "시도,시군구,읍면,동리,단지명"
  );

  query.set(
    "order",
    "시도.asc,시군구.asc,읍면.asc,동리.asc,단지명.asc"
  );

  /*
    검색어가 하나인 경우

    예:
    양산동
    호반
  */

  if (searchTokens.length === 1) {
    const token = searchTokens[0];

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

  /*
    검색어가 두 개 이상인 경우

    예:
    양산동 호반
  */

  if (searchTokens.length > 1) {
    const tokenFilters =
      searchTokens.map(function(token) {
        return (
          "or(" +
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
      });

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
    const response = await fetch(
      apiUrl,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_KEY,

          Authorization:
            "Bearer " + SUPABASE_KEY,

          Accept: "application/json",

          Prefer: "count=exact",

          Range:
            offset + "-" + end
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
          totalCount = parsed;
        }
      }
    }

    const apartments =
      data.map(function(item, index) {
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
      });

    return res.status(200).json({
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

    return res.status(500).json({
      ok: false,

      message:
        "아파트 데이터를 불러오는 중 오류가 발생했습니다."
    });
  }
}
