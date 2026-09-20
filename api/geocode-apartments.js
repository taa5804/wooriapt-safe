"use strict";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "GET only" });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !KAKAO_REST_API_KEY) {
    return res.status(500).json({
      error: "환경변수가 없습니다.",
      supabaseUrl: !!SUPABASE_URL,
      serviceKey: !!SUPABASE_SERVICE_ROLE_KEY,
      kakaoKey: !!KAKAO_REST_API_KEY
    });
  }

  try {
    /* 좌표가 없는 아파트 100개씩 가져오기 */
    const dbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/safe_apartments?select=*&latitude=is.null&limit=100`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    if (!dbRes.ok) {
      const text = await dbRes.text();
      throw new Error(`Supabase 조회 실패: ${text}`);
    }

    const apartments = await dbRes.json();

    if (apartments.length === 0) {
      return res.status(200).json({
        done: true,
        message: "모든 아파트의 좌표 생성이 완료되었습니다."
      });
    }

    let success = 0;
    let failed = 0;
    const failures = [];

    for (const apt of apartments) {
      /*
        CSV에서 실제 주소가 들어 있는 컬럼을 자동 탐색
      */
      const address =
        apt.address ||
        apt.주소 ||
        apt.road_address ||
        apt.도로명주소 ||
        apt.management_office_address ||
        apt.관리사무소주소 ||
        "";

      if (!address) {
        failed++;
        failures.push({
          id: apt.id,
          reason: "주소 없음"
        });
        continue;
      }

      try {
        /* Kakao 주소 → 좌표 */
        const kakaoRes = await fetch(
          `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
          {
            headers: {
              Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`
            }
          }
        );

        if (!kakaoRes.ok) {
          failed++;
          failures.push({
            id: apt.id,
            address,
            reason: `Kakao HTTP ${kakaoRes.status}`
          });
          continue;
        }

        const kakaoData = await kakaoRes.json();

        if (!kakaoData.documents || kakaoData.documents.length === 0) {
          failed++;
          failures.push({
            id: apt.id,
            address,
            reason: "좌표 검색 결과 없음"
          });
          continue;
        }

        const longitude = Number(kakaoData.documents[0].x);
        const latitude = Number(kakaoData.documents[0].y);

        /* Supabase 좌표 저장 */
        const updateRes = await fetch(
          `${SUPABASE_URL}/rest/v1/safe_apartments?id=eq.${encodeURIComponent(apt.id)}`,
          {
            method: "PATCH",
            headers: {
              apikey: SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal"
            },
            body: JSON.stringify({
              latitude,
              longitude
            })
          }
        );

        if (!updateRes.ok) {
          const text = await updateRes.text();

          failed++;
          failures.push({
            id: apt.id,
            address,
            reason: `DB 저장 실패: ${text}`
          });

          continue;
        }

        success++;

        /* API 과부하 방지 */
        await new Promise(resolve => setTimeout(resolve, 40));

      } catch (err) {
        failed++;

        failures.push({
          id: apt.id,
          address,
          reason: err.message
        });
      }
    }

    return res.status(200).json({
      done: false,
      processed: apartments.length,
      success,
      failed,
      message: "이번 100개 처리 완료",
      failures: failures.slice(0, 20)
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
};
