export default async function handler(req, res) {

  /* =========================================
     기본 응답 설정
  ========================================= */

  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );

  res.setHeader(
    "Cache-Control",
    "s-maxage=3600, stale-while-revalidate=86400"
  );


  /* =========================================
     GET 요청만 허용
  ========================================= */

  if (req.method !== "GET") {

    return res.status(405).json({
      ok: false,
      message: "GET 요청만 사용할 수 있습니다."
    });

  }


  /* =========================================
     Supabase 설정
  ========================================= */

  const SUPABASE_URL =
    "https://dcysjuxyjqtvkihdsjvv.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_RZBX7u1v8MLBCfEJT0-eRg_jPcIulG2";


  /* =========================================
     페이지 설정
  ========================================= */

  const pageNo =
    Math.max(
      1,
      parseInt(req.query.pageNo || "1", 10)
    );


  const requestedRows =
    parseInt(
      req.query.numOfRows || "1000",
      10
    );


  const numOfRows =
    Math.min(
      Math.max(requestedRows, 1),
      1000
    );


  const offset =
    (pageNo - 1) * numOfRows;


  const end =
    offset + numOfRows - 1;


  /* =========================================
     Supabase safe_apartments 조회
  ========================================= */

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
              "Bearer " + SUPABASE_KEY,

            Accept:
              "application/json",

            Prefer:
              "count=exact",

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


    /* =========================================
       전체 개수 확인
  ========================================= */

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


    /* =========================================
       기존 apt-list 응답 구조 유지
  ========================================= */

    const apartments =
      data.map(
        function(item, index) {

          const eupmyeon =
            item["읍면"] || "";

          const dongri =
            item["동리"] || "";


          return {

            /*
              기존 국토부 kaptCode 대신
              내부 임시 식별값
            */

            kaptCode:
              String(
                offset +
                index +
                1
              ),


            /*
              아파트명
            */

            kaptName:
              item["단지명"] || "",


            /*
              기존 국토부 법정동코드는
              현재 safe_apartments에 없으므로 공백 유지
            */

            bjdCode:
              "",


            /*
              시도
            */

            region:
              item["시도"] || "",


            /*
              시군구
            */

            city:
              item["시군구"] || "",


            /*
              읍면 + 동리
            */

            dong:
              [
                eupmyeon,
                dongri
              ]
              .filter(Boolean)
              .join(" "),


            /*
              상세 지역
            */

            detail:
              dongri || eupmyeon || ""

          };

        }
      );


    /* =========================================
       우리아파트 안심거래용 응답
  ========================================= */

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
