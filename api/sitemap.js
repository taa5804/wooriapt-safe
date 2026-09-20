"use strict";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;

// 확정값
const BATCH_SIZE = 50;

// 함수 시간초과를 피하기 위해
// 한 번 실행에서 최대 4묶음 = 200개 처리
const MAX_BATCHES = 4;

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

    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalFailed = 0;

    const failedResults = [];

    for (let batch = 1; batch <= MAX_BATCHES; batch++) {

      // PENDING 50개 가져오기
      const selectUrl =
        `${baseUrl}/rest/v1/safe_apartments` +
        `?select=*` +
        `&geocode_status=eq.PENDING` +
        `&limit=${BATCH_SIZE}`;

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

      // 더 이상 PENDING 없음
      if (!rows || rows.length === 0) {
        return res.status(200).json({
          ok: true,
          completed: true,
          message: "PENDING 데이터 없음 - 전체 완료",
          processed: totalProcessed,
          success: totalSuccess,
          failed: totalFailed,
          failedResults
        });
      }

      for (const row of rows) {

        // 실제 DB 확정 컬럼
        const apartmentName =
          String(row["단지명"] || "").trim();

        const address =
          String(row["관리사무소 주소"] || "").trim();

        totalProcessed++;

        // 단지명 없음
        if (!apartmentName) {
          totalFailed++;

          failedResults.push({
            apartmentName: "",
            address,
            error: "단지명 없음"
          });

          continue;
        }

        // 주소 없음
        if (!address) {
          totalFailed++;

          failedResults.push({
            apartmentName,
            address: "",
            error: "주소 없음"
          });

          continue;
        }

        try {

          // ==============================
          // 카카오 주소 → 위도/경도
          // ==============================

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
            totalFailed++;

            failedResults.push({
              apartmentName,
              address,
              error: "카카오 API 오류",
              status: kakaoResponse.status
            });

            continue;
          }

          let kakaoData;

          try {
            kakaoData = JSON.parse(kakaoText);
          } catch (e) {
            totalFailed++;

            failedResults.push({
              apartmentName,
              address,
              error: "카카오 응답 파싱 오류"
            });

            continue;
          }

          if (
            !kakaoData.documents ||
            kakaoData.documents.length === 0
          ) {
            totalFailed++;

            failedResults.push({
              apartmentName,
              address,
              error: "카카오 주소검색 결과 없음"
            });

            continue;
          }

          const latitude =
            Number(kakaoData.documents[0].y);

          const longitude =
            Number(kakaoData.documents[0].x);

          // ==============================
          // Supabase 업데이트
          // 단지명 + 관리사무소 주소
          // ==============================

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
              Prefer: "return=minimal"
            },
            body: JSON.stringify({
              latitude,
              longitude,
              geocode_status: "DONE"
            })
          });

          const updateText = await updateResponse.text();

          if (!updateResponse.ok) {
            totalFailed++;

            failedResults.push({
              apartmentName,
              address,
              error: "Supabase 업데이트 오류",
              response: updateText
            });

            continue;
          }

          totalSuccess++;

        } catch (error) {
          totalFailed++;

          failedResults.push({
            apartmentName,
            address,
            error: error.message
          });
        }
      }

      // 50개보다 적게 가져왔다면
      // 마지막 묶음일 가능성이 높음
      if (rows.length < BATCH_SIZE) {
        break;
      }
    }

    return res.status(200).json({
      ok: true,
      completed: false,
      message: "이번 실행 완료 - 다시 실행하면 다음 PENDING부터 계속",
      processed: totalProcessed,
      success: totalSuccess,
      failed: totalFailed,
      failedResults
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
};
