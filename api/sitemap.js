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

    const id = row.id;

    const address =
      row["관리사무소 연락처 주소"] ||
      row["도로명주소"] ||
      row["주소"] ||
      "";

    if (!address) {
      return res.status(200).json({
        ok: false,
        id: id,
        error: "주소 없음"
      });
    }

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
        id: id,
        address: address,
        error: "카카오 주소검색 결과 없음"
      });
    }

    const latitude =
      Number(kakaoData.documents[0].y);

    const longitude =
      Number(kakaoData.documents[0].x);

    const updateUrl =
      `${baseUrl}/rest/v1/safe_apartments?id=eq.${encodeURIComponent(id)}`;

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
        response: updateText
      });
    }

    return res.status(200).json({
      ok: true,
      id: id,
      address: address,
      latitude: latitude,
      longitude: longitude,
      geocode_status: "DONE",
      updated: updateText
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
};
