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

    // SUPABASE_URL에 /rest/v1이 들어 있어도 정상 처리
    const baseUrl = SUPABASE_URL.replace(/\/rest\/v1\/?$/, "");

    // PENDING 상태 1건 가져오기
    const selectUrl =
      `${baseUrl}/rest/v1/safe_apartments` +
      `?select=*` +
      `&geocode_status=eq.PENDING` +
      `&limit=1`;

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
        message: "PENDING 데이터 없음"
      });
    }

    const row = rows[0];

    const apartmentName =
      String(row["단지명"] || "").trim();

    const address =
      String(
        row["관리사무소 연락처 주소"] ||
        row["도로명주소"] ||
        row["주소"] ||
        ""
      ).trim();

    if (!apartmentName) {
      return res.status(200).json({
        ok: false,
        error: "단지명 없음"
      });
    }

    if (!address) {
      return res.status(200).json({
        ok: false,
        apartmentName: apartmentName,
        error: "주소 없음"
      });
    }

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
      return res.status(500).json({
        ok: false,
        step: "kakao_geocode",
        status: kakaoResponse.status,
        apartmentName: apartmentName,
        address: address,
        response: kakaoText
      });
    }

    let kakaoData;

    try {
      kakaoData = JSON.parse(kakaoText);
    } catch (e) {
      return res.status(500).json({
        ok: false,
        step: "parse_kakao_response",
        response: kakaoText
      });
    }

    if (
      !kakaoData.documents ||
      kakaoData.documents.length === 0
    ) {
      return res.status(200).json({
        ok: false,
        apartmentName: apartmentName,
        address: address,
        error: "카카오 주소검색 결과 없음"
      });
    }

    const latitude =
      Number(kakaoData.documents[0].y);

    const longitude =
      Number(kakaoData.documents[0].x);

    // 단지명 + 관리사무소 연락처 주소
    // 두 조건이 모두 일치하는 행만 업데이트
    const updateUrl =
      `${baseUrl}/rest/v1/safe_apartments` +
      `?${encodeURIComponent("단지명")}=eq.${encodeURIComponent(apartmentName)}` +
      `&${encodeURIComponent("관리사무소 연락처 주소")}=eq.${encodeURIComponent(address)}`;

    const updateResponse = await fetch(updateUrl, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        latitude: latitude,
        longitude: longitude,
        geocode_status: "DONE"
      })
    });

    const updateText = await updateResponse.text();

    if (!updateResponse.ok) {
      return res.status(500).json({
        ok: false,
        step: "supabase_update",
        status: updateResponse.status,
        apartmentName: apartmentName,
        address: address,
        response: updateText
      });
    }

    let updatedRows = [];

    try {
      updatedRows = JSON.parse(updateText);
    } catch (e) {
      updatedRows = [];
    }

    return res.status(200).json({
      ok: true,
      apartmentName: apartmentName,
      address: address,
      latitude: latitude,
      longitude: longitude,
      geocode_status: "DONE",
      updatedCount: updatedRows.length
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
};
