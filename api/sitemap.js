"use strict";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;

const BATCH_SIZE = 50;
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

    // =====================================================
    // 상태 변경 함수
    // 단지명 + 관리사무소 주소 기준
    // =====================================================

    async function updateApartment(
      apartmentName,
      address,
      data
    ) {
      const updateUrl =
        `${baseUrl}/rest/v1/safe_apartments` +
        `?${encodeURIComponent("단지명")}=eq.${encodeURIComponent(apartmentName)}` +
        `&${encodeURIComponent("관리사무소 주소")}=eq.${encodeURIComponent(address)}`;

      const response = await fetch(updateUrl, {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_SECRET_KEY,
          Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify(data)
      });

      const text = await response.text();

      return {
        ok: response.ok,
        status: response.status,
        response: text
      };
    }

    // =====================================================
    // 최대 4회 × 50개 = 200개
    // =====================================================

    for (let batch = 1; batch <= MAX_BATCHES; batch++) {

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
      } catch (error) {
        return res.status(500).json({
          ok: false,
          step: "parse_supabase_response",
          response: selectText
        });
      }

      // ===================================================
      // PENDING 없음 = 전체 좌표변환 작업 완료
      // ===================================================

      if (!rows || rows.length === 0) {
        return res.status(200).json({
          ok: true,
          completed: true,
          message: "전체 좌표 변환 완료",
          processed: totalProcessed,
          success: totalSuccess,
          failed: totalFailed,
          failedResults
        });
      }

      // ===================================================
      // 50개 처리
      // ===================================================

      for (const row of rows) {

        // 확정된 실제 DB 컬럼
        const apartmentName =
          String(row["단지명"] || "").trim();

        const address =
          String(row["관리사무소 주소"] || "").trim();

        totalProcessed++;

        // =================================================
        // 단지명 없음
        // =================================================

        if (!apartmentName) {
          totalFailed++;

          failedResults.push({
            apartmentName: "",
            address,
            error: "단지명 없음"
          });

          continue;
        }

        // =================================================
        // 주소 없음
        // =================================================

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

          // =================================================
          // 카카오 주소검색
          // =================================================

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

          // =================================================
          // 카카오 API 자체 오류
          // 이 경우는 FAILED 처리하지 않고 다음 실행에서 재시도
          // =================================================

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
          } catch (error) {
            totalFailed++;

            failedResults.push({
              apartmentName,
              address,
              error: "카카오 응답 파싱 오류"
            });

            continue;
          }

          // =================================================
          // 주소검색 결과 없음
          // FAILED로 변경해서 반복 검색 방지
          // =================================================

          if (
            !kakaoData.documents ||
            kakaoData.documents.length === 0
          ) {

            const failedUpdate = await updateApartment(
              apartmentName,
              address,
              {
                geocode_status: "FAILED"
              }
            );

            if (!failedUpdate.ok) {
              totalFailed++;

              failedResults.push({
                apartmentName,
                address,
                error: "FAILED 상태 저장 오류",
                response: failedUpdate.response
              });

              continue;
            }

            totalFailed++;

            failedResults.push({
              apartmentName,
              address,
              error: "카카오 주소검색 결과 없음"
            });

            continue;
          }

          // =================================================
          // 위도 / 경도
          // =================================================

          const latitude =
            Number(kakaoData.documents[0].y);

          const longitude =
            Number(kakaoData.documents[0].x);

          // =================================================
          // 성공 데이터 저장
          // =================================================

          const doneUpdate = await updateApartment(
            apartmentName,
            address,
            {
              latitude,
              longitude,
              geocode_status: "DONE"
            }
          );

          if (!doneUpdate.ok) {
            totalFailed++;

            failedResults.push({
              apartmentName,
              address,
              error: "Supabase 업데이트 오류",
              response: doneUpdate.response
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

      // 마지막 묶음
      if (rows.length < BATCH_SIZE) {
        break;
      }
    }

    return res.status(200).json({
      ok: true,
      completed: false,
      message: "이번 실행 완료 - 남은 PENDING 데이터 있음",
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
