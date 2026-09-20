"use strict";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const KAKAO_REST_API_KEY =
  process.env.KAKAO_REST_API_KEY;

const BATCH_SIZE = 50;
const DELAY_MS = 50;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getAddress(apt) {
  return (
    apt.address ||
    apt.주소 ||
    apt.road_address ||
    apt.도로명주소 ||
    apt.management_office_address ||
    apt.관리사무소주소 ||
    ""
  ).trim();
}

async function geocode(address) {
  const url =
    "https://dapi.kakao.com/v2/local/search/address.json?query=" +
    encodeURIComponent(address);

  const response = await fetch(url, {
    headers: {
      Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`Kakao HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!data.documents || data.documents.length === 0) {
    return null;
  }

  return {
    longitude: Number(data.documents[0].x),
    latitude: Number(data.documents[0].y)
  };
}

async function updateCoordinates(id, coords) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/safe_apartments?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization:
          `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(coords)
    }
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

async function processBatch(baseUrl) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/safe_apartments?select=*&latitude=is.null&limit=${BATCH_SIZE}`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization:
          `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const apartments = await response.json();

  if (apartments.length === 0) {
    return {
      done: true,
      processed: 0
    };
  }

  let success = 0;
  let failed = 0;

  for (const apt of apartments) {
    const address = getAddress(apt);

    if (!address) {
      failed++;
      continue;
    }

    try {
      const coords = await geocode(address);

      if (!coords) {
        failed++;
        continue;
      }

      await updateCoordinates(apt.id, coords);
      success++;

    } catch (error) {
      failed++;
    }

    await sleep(DELAY_MS);
  }

  /*
    현재 요청이 끝나기 전에
    다음 배치를 자동으로 호출
  */
  fetch(`${baseUrl}/api/geocode-apartments?continue=1`)
    .catch(() => {});

  return {
    done: false,
    processed: apartments.length,
    success,
    failed
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
    const protocol =
      req.headers["x-forwarded-proto"] || "https";

    const host = req.headers.host;

    const baseUrl = `${protocol}://${host}`;

    const result =
      await processBatch(baseUrl);

    return res.status(200).json({
      message: result.done
        ? "전체 지오코딩 완료"
        : "전체 자동 지오코딩 진행 중",
      ...result
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
};
