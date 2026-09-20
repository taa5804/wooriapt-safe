"use strict";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;

const BATCH_SIZE = 50;

// Hobby 최대 300초.
// 안전하게 270초에서 종료.
const MAX_RUNTIME_MS = 270000;

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  const startedAt = Date.now();

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

    const baseUrl =
      SUPABASE_URL.replace(/\/rest\/v1\/?$/, "");

    let processed = 0;
    let success = 0;
    let failed = 0;
    let batches = 0;

    const failedResults = [];

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
        text
      };
    }

    while (Date.now() - startedAt < MAX_RUNTIME_MS) {

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

      const selectText =
        await selectResponse.text();

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

      // ================================
      // PENDING 0 = 전체 완료
      // ================================

      if (!rows || rows.length === 0) {
        return res.status(200).json({
          ok: true,
          completed: true,
          message: "전체 좌표 변환 완료",
          batches,
          processed,
          success,
          failed,
          elapsedSeconds:
            Math.round((Date.now() - startedAt) / 1000),
          failedResults
        });
      }

      batches++;

      for (const row of rows) {

        // 실행시간 확인
        if (
          Date.now() - startedAt >=
          MAX_RUNTIME_MS
        ) {
          break;
        }

        // =================================
        // 실제 DB 확정 컬럼
        // =================================

        const apartmentName =
          String(row["단지명"] || "").trim();

        const address =
          String(
            row["관리사무소 주소"] || ""
          ).trim();

        processed++;

        // =================================
        // 단지명 없음
        // =================================

        if (!apartmentName) {
          failed++;

          failedResults.push({
            apartmentName: "",
            address,
            error: "단지명 없음"
          });

          continue;
        }

        // =================================
        // 주소 없음
        // =================================

        if (!address) {
          failed++;

          failedResults.push({
            apartmentName,
            address: "",
            error: "주소 없음"
          });

          continue;
        }

        try {

          // =================================
          // 카카오 주소 검색
          // =================================

          const kakaoUrl =
            "https://dapi.kakao.com/v2/local/search/address.json?query=" +
            encodeURIComponent(address);

          const kakaoResponse =
            await fetch(kakaoUrl, {
              method: "GET",
              headers: {
                Authorization:
                  `KakaoAK ${KAKAO_REST_API_KEY}`
              }
            });

          const kakaoText =
            await kakaoResponse.text();

          // API 일시 오류는 PENDING 유지
          if (!kakaoResponse.ok) {
            failed++;

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
            kakaoData =
              JSON.parse(kakaoText);
          } catch (error) {
            failed++;

            failedResults.push({
              apartmentName,
              address,
              error: "카카오 응답 파싱 오류"
            });

            continue;
          }

          // =================================
          // 검색 결과 없음 → FAILED
          // =================================

          if (
            !kakaoData.documents ||
            kakaoData.documents.length === 0
          ) {

            const failedUpdate =
              await updateApartment(
                apartmentName,
                address,
                {
                  geocode_status: "FAILED"
                }
              );

            if (!failedUpdate.ok) {
              failed++;

              failedResults.push({
                apartmentName,
                address,
                error:
                  "FAILED 상태 저장 오류",
                response:
                  failedUpdate.text
              });

              continue;
            }

            failed++;

            failedResults.push({
              apartmentName,
              address,
              error:
                "카카오 주소검색 결과 없음"
            });

            continue;
          }

          // =================================
          // 좌표
          // =================================

          const latitude =
            Number(
              kakaoData.documents[0].y
            );

          const longitude =
            Number(
              kakaoData.documents[0].x
            );

          // =================================
          // DONE 저장
          // =================================

          const doneUpdate =
            await updateApartment(
              apartmentName,
              address,
              {
                latitude,
                longitude,
                geocode_status: "DONE"
              }
            );

          if (!doneUpdate.ok) {
            failed++;

            failedResults.push({
              apartmentName,
              address,
              error:
                "Supabase 업데이트 오류",
              response:
                doneUpdate.text
            });

            continue;
          }

          success++;

        } catch (error) {

          failed++;

          failedResults.push({
            apartmentName,
            address,
            error: error.message
          });
        }
      }
    }

    // =====================================
    // 270초 도달
    // 데이터는 그대로 보존
    // 다음 실행은 남은 PENDING부터 시작
    // =====================================

    return res.status(200).json({
      ok: true,
      completed: false,
      message:
        "이번 실행시간 완료 - 남은 PENDING 있음",
      batches,
      processed,
      success,
      failed,
      elapsedSeconds:
        Math.round(
          (Date.now() - startedAt) / 1000
        ),
      failedResults
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
};
