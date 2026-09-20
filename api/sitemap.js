"use strict";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  try {
    if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
      return res.status(500).json({
        ok: false,
        error: "Supabase 환경변수 누락"
      });
    }

    if (!KAKAO_REST_API_KEY) {
      return res.status(500).json({
        ok: false,
        error: "KAKAO_REST_API_KEY 환경변수 누락"
      });
    }

    const baseUrl = SUPABASE_URL.replace(/\/rest\/v1\/?$/, "");

    // PENDING 50개 가져오기
    const selectUrl =
      `${baseUrl}/rest/v1/safe_apartments` +
      `?select=*` +
      `&geocode_status=eq.PENDING` +
      `&limit=50`;

    const selectResponse = await fetch(selectUrl, {
      method: "GET",
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
        Accept: "application/json"
      }
    });

    const selectText = await selectResponse.text();

    if (!selectResponse.ok) {
      return res.status(500).json({
        ok: false,
        step: "supabase_select",
        status: selectResponse.status,
        response: selectText
      });
    }

    let rows;

    try {
      rows = JSON.parse(selectText);
    } catch (e) {
      return res.status(500).json({
        ok: false,
        step: "parse_supabase_response",
        response: selectText
      });
    }

    if (!rows || rows.length === 0) {
      return res.status(200).json({
        ok: true,
        message: "PENDING 데이터 없음",
        processed: 0,
        success: 0,
        failed: 0
      });
    }

    let success = 0;
    let failed = 0;
    const results = [];

    for (const row of rows) {
      // 실제 DB 컬럼명 고정
      const apartmentName =
        String(row["단지명"] || "").trim();

      const address =
        String(row["관리사무소 주소"] || "").trim();

      if (!apartmentName || !address) {
        failed++;

        results.push({
          apartmentName,
          address,
          ok: false,
          error: !apartmentName ? "단지명 없음" : "주소 없음"
        });

        continue;
      }

      try {
        // 카카오 주소검색
        const kakaoUrl =
          "https://dapi.kakao.com/v2/local/search/address.json?query=" +
          encodeURIComponent(address);

        const kakaoResponse = await fetch(kakaoUrl, {
          method: "GET",
          headers: {
            Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`
          }
        });

        const kakaoText = await kakaoResponse.text();

        if (!kakaoResponse.ok) {
          failed++;

          results.push({
            apartmentName,
            address,
            ok: false,
            error: "카카오 API 오류",
            status: kakaoResponse.status
          });

          continue;
        }

        let kakaoData;

        try {
          kakaoData = JSON.parse(kakaoText);
        } catch (e) {
          failed++;

          results.push({
            apartmentName,
            address,
            ok: false,
            error: "카카오 응답 파싱 오류"
          });

          continue;
        }

        if (
          !kakaoData.documents ||
          kakaoData.documents.length === 0
        ) {
          failed++;

          results.push({
            apartmentName,
            address,
            ok: false,
            error: "카카오 주소검색 결과 없음"
          });

          continue;
        }

        const latitude =
          Number(kakaoData.documents[0].y);

        const longitude =
          Number(kakaoData.documents[0].x);

        // 확정된 실제 DB 컬럼명
        const updateUrl =
          `${baseUrl}/rest/v1/safe_apartments` +
          `?${encodeURIComponent("단지명")}=eq.${encodeURIComponent(apartmentName)}` +
          `&${encodeURIComponent("관리사무소 주소")}=eq.${encodeURIComponent(address)}`;

        const updateResponse = await fetch(updateUrl, {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_SECRET_KEY,
            Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation"
          },
          body: JSON.stringify({
            latitude,
            longitude,
            geocode_status: "DONE"
          })
        });

        const updateText = await updateResponse.text();

        if (!updateResponse.ok) {
          failed++;

          results.push({
            apartmentName,
            address,
            ok: false,
            error: "Supabase 업데이트 오류",
            response: updateText
          });

          continue;
        }

        success++;

        results.push({
          apartmentName,
          address,
          latitude,
          longitude,
          ok: true
        });

      } catch (error) {
        failed++;

        results.push({
          apartmentName,
          address,
          ok: false,
          error: error.message
        });
      }
    }

    return res.status(200).json({
      ok: true,
      processed: rows.length,
      success,
      failed,
      results
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
};
