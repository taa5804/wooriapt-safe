"use strict";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;

const BATCH_SIZE = 50;
const DELAY_MS = 50;

const sleep = (ms) =>
  new Promise(resolve => setTimeout(resolve, ms));

function getAddress(apt) {
  return String(
    apt.address ||
    apt.주소 ||
    apt.road_address ||
    apt.도로명주소 ||
    apt.management_office_address ||
    apt.관리사무소주소 ||
    ""
  ).trim();
}

async function updateRow(id, body) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/safe_apartments?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(body)
    }
  );

  if (!r.ok) {
    throw new Error(await r.text());
  }
}

async function geocode(address) {
  const r = await fetch(
    "https://dapi.kakao.com/v2/local/search/address.json?query=" +
      encodeURIComponent(address),
    {
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`
      }
    }
  );

  if (!r.ok) {
    throw new Error(`Kakao HTTP ${r.status}`);
  }

  const data = await r.json();

  if (!data.documents?.length) {
    return null;
  }

  return {
    latitude: Number(data.documents[0].y),
    longitude: Number(data.documents[0].x)
  };
}

module.exports = async function handler(req, res) {
  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );

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
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/safe_apartments` +
      `?select=*&geocode_status=eq.PENDING&limit=${BATCH_SIZE}`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    if (!r.ok) {
      throw new Error(await r.text());
    }

    const apartments = await r.json();

    if (apartments.length === 0) {
      return res.status(200).json({
        done: true,
        message: "전체 지오코딩 완료"
      });
    }

    let success = 0;
    let failed = 0;

    for (const apt of apartments) {
      const address = getAddress(apt);

      if (!address) {
        await updateRow(apt.id, {
          geocode_status: "FAILED"
        });

        failed++;
        continue;
      }

      try {
        const coords = await geocode(address);

        if (!coords) {
          await updateRow(apt.id, {
            geocode_status: "FAILED"
          });

          failed++;
        } else {
          await updateRow(apt.id, {
            latitude: coords.latitude,
            longitude: coords.longitude,
            geocode_status: "SUCCESS"
          });

          success++;
        }
      } catch (e) {
        await updateRow(apt.id, {
          geocode_status: "FAILED"
        });

        failed++;
      }

      await sleep(DELAY_MS);
    }

    /*
      다음 50건을 자동 실행
    */
    const protocol =
      req.headers["x-forwarded-proto"] || "https";

    const host = req.headers.host;

    const nextUrl =
      `${protocol}://${host}/api/geocode-apartments`;

    fetch(nextUrl).catch(() => {});

    return res.status(200).json({
      done: false,
      message: "전체 자동 지오코딩 진행 중",
      batch: apartments.length,
      success,
      failed
    });

  } catch (e) {
    return res.status(500).json({
      error: e.message
    });
  }
};
