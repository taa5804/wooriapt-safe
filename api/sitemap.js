"use strict";

/*
=========================================================
 sitemap.js

 1) /api/sitemap
    -> sitemap.xml 생성

 2) /api/sitemap?geocode=1
    -> safe_apartments 전체 지오코딩 실행

 Vercel API 파일 추가 없음
=========================================================
*/

const SUPABASE_URL =
  process.env.SUPABASE_URL;

/*
  현재 프로젝트의 서버용 Secret Key 사용
*/
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SECRET_KEY;

const KAKAO_REST_API_KEY =
  process.env.KAKAO_REST_API_KEY;

const GEOCODE_BATCH_SIZE = 50;


/* =====================================================
   공통
===================================================== */

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


function supabaseHeaders() {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization:
      `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json"
  };
}


/* =====================================================
   아파트 주소 찾기
===================================================== */

function getApartmentAddress(apt) {

  const directAddress =
    apt.address ||
    apt.주소 ||
    apt.road_address ||
    apt.도로명주소 ||
    apt.management_office_address ||
    apt.관리사무소주소 ||
    "";

  if (String(directAddress).trim()) {
    return String(directAddress).trim();
  }


  return [
    apt.sido ||
      apt.시도,

    apt.sigungu ||
      apt.시군구,

    apt.eupmyeon ||
      apt.읍면,

    apt.dong ||
      apt.동리 ||
      apt.읍면동,

    apt.apartment_name ||
      apt.apt_name ||
      apt.단지명
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}


/* =====================================================
   Kakao 주소 검색
===================================================== */

async function searchKakaoAddress(address) {

  const response = await fetch(
    "https://dapi.kakao.com/v2/local/search/address.json" +
    "?query=" +
    encodeURIComponent(address),
    {
      headers: {
        Authorization:
          `KakaoAK ${KAKAO_REST_API_KEY}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      `Kakao address HTTP ${response.status}`
    );
  }

  const data = await response.json();

  if (
    data.documents &&
    data.documents.length > 0
  ) {
    return data.documents[0];
  }

  return null;
}


/* =====================================================
   Kakao 키워드 검색
===================================================== */

async function searchKakaoKeyword(address) {

  const response = await fetch(
    "https://dapi.kakao.com/v2/local/search/keyword.json" +
    "?query=" +
    encodeURIComponent(address),
    {
      headers: {
        Authorization:
          `KakaoAK ${KAKAO_REST_API_KEY}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      `Kakao keyword HTTP ${response.status}`
    );
  }

  const data = await response.json();

  if (
    data.documents &&
    data.documents.length > 0
  ) {
    return data.documents[0];
  }

  return null;
}


/* =====================================================
   Supabase 행 업데이트
===================================================== */

async function updateApartment(id, body) {

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/safe_apartments` +
    `?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",

      headers: {
        ...supabaseHeaders(),
        Prefer: "return=minimal"
      },

      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {

    const errorText =
      await response.text();

    throw new Error(
      `Supabase update error: ${errorText}`
    );
  }
}


/* =====================================================
   전체 지오코딩
===================================================== */

async function runApartmentGeocode(req, res) {

  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY ||
    !KAKAO_REST_API_KEY
  ) {

    return res.status(500).json({
      error: "환경변수 누락"
    });
  }


  try {

    /*
      좌표가 없고 아직 처리 대기중인
      아파트 50개씩 가져옴
    */

    const dbResponse = await fetch(

      `${SUPABASE_URL}/rest/v1/safe_apartments` +
      `?select=*` +
      `&latitude=is.null` +
      `&geocode_status=eq.PENDING` +
      `&limit=${GEOCODE_BATCH_SIZE}`,

      {
        headers:
          supabaseHeaders()
      }
    );


    if (!dbResponse.ok) {

      const errorText =
        await dbResponse.text();

      throw new Error(
        `Supabase select error: ${errorText}`
      );
    }


    const apartments =
      await dbResponse.json();


    /*
      남은 PENDING 데이터가 없으면 완료
    */

    if (apartments.length === 0) {

      return res.status(200).json({

        done: true,

        message:
          "전체 아파트 지오코딩 완료"

      });
    }


    let success = 0;
    let failed = 0;


    /*
      현재 50개 처리
    */

    for (const apt of apartments) {

      const address =
        getApartmentAddress(apt);


      /*
        사용할 주소가 전혀 없음
      */

      if (!address) {

        try {

          await updateApartment(
            apt.id,
            {
              geocode_status:
                "FAILED"
            }
          );

        } catch (error) {

          console.error(
            "FAILED STATUS ERROR",
            apt.id,
            error.message
          );
        }


        failed++;

        continue;
      }


      try {

        /*
          1차:
          정확한 주소로 검색
        */

        let document =
          await searchKakaoAddress(
            address
          );


        /*
          2차:
          주소검색 실패 시
          아파트/장소 키워드 검색
        */

        if (!document) {

          document =
            await searchKakaoKeyword(
              address
            );
        }


        /*
          검색 결과 없음
        */

        if (!document) {

          await updateApartment(
            apt.id,
            {
              geocode_status:
                "FAILED"
            }
          );


          failed++;

          continue;
        }


        /*
          좌표 추출
        */

        const latitude =
          Number(document.y);

        const longitude =
          Number(document.x);


        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {

          await updateApartment(
            apt.id,
            {
              geocode_status:
                "FAILED"
            }
          );


          failed++;

          continue;
        }


        /*
          Supabase에 좌표 영구 저장
        */

        await updateApartment(
          apt.id,
          {
            latitude,
            longitude,

            geocode_status:
              "SUCCESS"
          }
        );


        success++;

      }

      catch (error) {

        /*
          일시적 오류는 PENDING 유지
          다음 처리 때 재시도
        */

        console.error(
          "GEOCODE ERROR",
          apt.id,
          address,
          error.message
        );
      }


      await sleep(50);
    }


    /*
      다음 50개 자동 요청
    */

    const protocol =
      req.headers["x-forwarded-proto"] ||
      "https";

    const host =
      req.headers.host;

    const nextUrl =
      `${protocol}://${host}` +
      `/api/sitemap?geocode=1`;


    fetch(nextUrl)
      .catch(error => {

        console.error(
          "NEXT BATCH ERROR",
          error.message
        );

      });


    /*
      현재 처리 결과
    */

    return res.status(200).json({

      done: false,

      message:
        "전체 아파트 자동 지오코딩 진행 중",

      batch:
        apartments.length,

      success,

      failed

    });

  }

  catch (error) {

    console.error(
      "GEOCODE FATAL ERROR",
      error
    );


    return res.status(500).json({

      error:
        error.message

    });
  }
}


/* =====================================================
   sitemap
===================================================== */

async function runSitemap(req, res) {

  const baseUrl =
    "https://www.wooriapt.app";


  const xml =
`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/apt-sitemap.xml</loc>
  </sitemap>
</sitemapindex>`;


  res.setHeader(
    "Content-Type",
    "application/xml; charset=utf-8"
  );


  res.setHeader(
    "Cache-Control",
    "s-maxage=3600, stale-while-revalidate=86400"
  );


  return res
    .status(200)
    .send(xml);
}


/* =====================================================
   Vercel Handler
===================================================== */

module.exports =
async function handler(req, res) {

  /*
    geocode 실행
  */

  if (
    req.query &&
    req.query.geocode === "1"
  ) {

    return runApartmentGeocode(
      req,
      res
    );
  }


  /*
    일반 sitemap 요청
  */

  return runSitemap(
    req,
    res
  );
};
