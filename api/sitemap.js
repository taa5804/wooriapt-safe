/* =========================================================
   아파트 전체 지오코딩
   실행: /api/sitemap?geocode=1
   기존 sitemap 기능은 아래 코드 그대로 유지
========================================================= */

const GEOCODE_BATCH_SIZE = 50;

async function runApartmentGeocode(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY || !KAKAO_KEY) {
    return res.status(500).json({
      error: "환경변수 누락"
    });
  }

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json"
  };

  try {

    /* -----------------------------------------
       아직 좌표가 없는 아파트 50개
    ----------------------------------------- */

    const dbResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/safe_apartments` +
      `?select=*&latitude=is.null` +
      `&geocode_status=eq.PENDING` +
      `&limit=${GEOCODE_BATCH_SIZE}`,
      {
        headers
      }
    );

    if (!dbResponse.ok) {
      throw new Error(
        "Supabase 조회 실패: " +
        await dbResponse.text()
      );
    }

    const apartments = await dbResponse.json();

    /* -----------------------------------------
       더 이상 처리할 데이터가 없음
    ----------------------------------------- */

    if (apartments.length === 0) {

      const countResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/safe_apartments` +
        `?select=geocode_status`,
        {
          headers: {
            ...headers,
            Prefer: "count=exact"
          }
        }
      );

      return res.status(200).json({
        done: true,
        message: "전체 아파트 지오코딩 완료"
      });
    }

    let success = 0;
    let failed = 0;

    /* -----------------------------------------
       50개 처리
    ----------------------------------------- */

    for (const apt of apartments) {

      let address = String(
        apt.address ||
        apt.주소 ||
        apt.road_address ||
        apt.도로명주소 ||
        apt.management_office_address ||
        apt.관리사무소주소 ||
        ""
      ).trim();

      /* ---------------------------------------
         주소가 없으면 지역 + 아파트명 조합
      --------------------------------------- */

      if (!address) {

        address = [
          apt.sido || apt.시도,
          apt.sigungu || apt.시군구,
          apt.dong || apt.읍면동 || apt.동리,
          apt.apartment_name ||
          apt.apt_name ||
          apt.단지명
        ]
          .filter(Boolean)
          .join(" ");
      }

      /* ---------------------------------------
         그래도 주소가 없으면 FAILED
      --------------------------------------- */

      if (!address) {

        await fetch(
          `${SUPABASE_URL}/rest/v1/safe_apartments` +
          `?id=eq.${encodeURIComponent(apt.id)}`,
          {
            method: "PATCH",
            headers,
            body: JSON.stringify({
              geocode_status: "FAILED"
            })
          }
        );

        failed++;
        continue;
      }

      try {

        /* -------------------------------------
           1차: Kakao 주소 검색
        ------------------------------------- */

        let kakaoResponse = await fetch(
          "https://dapi.kakao.com/v2/local/search/address.json" +
          `?query=${encodeURIComponent(address)}`,
          {
            headers: {
              Authorization: `KakaoAK ${KAKAO_KEY}`
            }
          }
        );

        let kakaoData = await kakaoResponse.json();

        let document =
          kakaoData.documents &&
          kakaoData.documents[0];

        /* -------------------------------------
           2차: 주소검색 실패하면 키워드 검색
        ------------------------------------- */

        if (!document) {

          kakaoResponse = await fetch(
            "https://dapi.kakao.com/v2/local/search/keyword.json" +
            `?query=${encodeURIComponent(address)}`,
            {
              headers: {
                Authorization:
                  `KakaoAK ${KAKAO_KEY}`
              }
            }
          );

          kakaoData = await kakaoResponse.json();

          document =
            kakaoData.documents &&
            kakaoData.documents[0];
        }

        /* -------------------------------------
           검색 결과 없음
        ------------------------------------- */

        if (!document) {

          await fetch(
            `${SUPABASE_URL}/rest/v1/safe_apartments` +
            `?id=eq.${encodeURIComponent(apt.id)}`,
            {
              method: "PATCH",
              headers,
              body: JSON.stringify({
                geocode_status: "FAILED"
              })
            }
          );

          failed++;
          continue;
        }

        const latitude =
          Number(document.y);

        const longitude =
          Number(document.x);

        /* -------------------------------------
           좌표 저장
        ------------------------------------- */

        const updateResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/safe_apartments` +
          `?id=eq.${encodeURIComponent(apt.id)}`,
          {
            method: "PATCH",
            headers,
            body: JSON.stringify({
              latitude,
              longitude,
              geocode_status: "SUCCESS"
            })
          }
        );

        if (!updateResponse.ok) {
          throw new Error(
            await updateResponse.text()
          );
        }

        success++;

      } catch (error) {

        /* 일시적인 API 오류는 FAILED 처리하지 않고
           PENDING으로 남겨 다음 실행에서 재시도 */

        console.error(
          "GEOCODE ERROR",
          apt.id,
          error.message
        );
      }

      /* Kakao 요청 간격 */

      await new Promise(
        resolve => setTimeout(resolve, 50)
      );
    }

    /* -----------------------------------------
       다음 50개 자동 실행
    ----------------------------------------- */

    const protocol =
      req.headers["x-forwarded-proto"] ||
      "https";

    const host =
      req.headers.host;

    const nextUrl =
      `${protocol}://${host}/api/sitemap?geocode=1`;

    fetch(nextUrl).catch(() => {});

    return res.status(200).json({
      done: false,
      message:
        "전체 21,437개 자동 지오코딩 진행 중",
      batch: apartments.length,
      success,
      failed
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
