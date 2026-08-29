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
     공공데이터포털 인증키
     Vercel Environment Variables
     MOLIT_APT_API_KEY
  ========================================= */

  const storedServiceKey =
    process.env.MOLIT_APT_API_KEY;


  if (!storedServiceKey) {

    return res.status(500).json({
      ok: false,
      message: "공동주택 API 인증키가 설정되지 않았습니다."
    });

  }


  /*
    공공데이터포털의 Encoding 인증키를
    Vercel에 저장한 경우 URLSearchParams에서
    다시 Encoding되는 것을 방지하기 위해
    먼저 원래 값으로 복원합니다.
  */

  let serviceKey =
    storedServiceKey.trim();


  try {

    serviceKey =
      decodeURIComponent(serviceKey);

  } catch (error) {

    serviceKey =
      storedServiceKey.trim();

  }


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


  /* =========================================
     국토교통부 공동주택 단지 목록 API
  ========================================= */

  const endpoint =
    "https://apis.data.go.kr/1613000/AptListService4/getTotalAptList4";


  const query =
    new URLSearchParams();


  query.set(
    "serviceKey",
    serviceKey
  );

  query.set(
    "pageNo",
    String(pageNo)
  );

  query.set(
    "numOfRows",
    String(numOfRows)
  );


  const apiUrl =
    endpoint +
    "?" +
    query.toString();


  try {

    /* =========================================
       국토교통부 API 호출
    ========================================= */

    const response =
      await fetch(
        apiUrl,
        {
          method: "GET",
          headers: {
            Accept: "application/json"
          }
        }
      );


    if (!response.ok) {

      return res.status(502).json({
        ok: false,
        message: "국토교통부 공동주택 API 호출에 실패했습니다.",
        status: response.status
      });

    }


    const data =
      await response.json();


    /* =========================================
       응답 구조 확인
    ========================================= */

    const responseData =
      data &&
      data.response
        ? data.response
        : {};


    const header =
      responseData.header || {};


    const body =
      responseData.body || {};


    if (
      header.resultCode &&
      String(header.resultCode) !== "00"
    ) {

      return res.status(502).json({
        ok: false,
        message:
          header.resultMsg ||
          "공동주택 데이터를 불러오지 못했습니다.",
        resultCode:
          header.resultCode
      });

    }


    /* =========================================
       아파트 목록 정리
    ========================================= */

    let items = [];


    if (
      body.items &&
      Array.isArray(body.items.item)
    ) {

      items =
        body.items.item;

    } else if (
      body.items &&
      body.items.item
    ) {

      items = [
        body.items.item
      ];

    } else if (
      Array.isArray(body.items)
    ) {

      items =
        body.items;

    }


    const apartments =
      items.map(
        function(item) {

          return {

            kaptCode:
              item.kaptCode || "",

            kaptName:
              item.kaptName || "",

            bjdCode:
              item.bjdCode || "",

            region:
              item.as1 || "",

            city:
              item.as2 || "",

            dong:
              item.as3 || "",

            detail:
              item.as4 || ""

          };

        }
      );


    /* =========================================
       우리아파트 안심거래용 응답
    ========================================= */

    return res.status(200).json({

      ok: true,

      pageNo:
        Number(
          body.pageNo ||
          pageNo
        ),

      numOfRows:
        Number(
          body.numOfRows ||
          numOfRows
        ),

      totalCount:
        Number(
          body.totalCount ||
          apartments.length
        ),

      count:
        apartments.length,

      apartments:
        apartments

    });


  } catch (error) {

    console.error(
      "APT LIST API ERROR:",
      error
    );


    return res.status(500).json({

      ok: false,

      message:
        "공동주택 데이터를 불러오는 중 오류가 발생했습니다."

    });

  }

}
