export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      message: "허용되지 않은 요청입니다."
    });
  }

  const requestNumber = String(
    req.query.requestNumber || ""
  )
    .replace(/\D/g, "")
    .slice(0, 4);

  if (requestNumber.length !== 4) {
    return res.status(400).json({
      ok: false,
      message: "4자리 매수요청번호를 입력해 주세요."
    });
  }

  const SUPABASE_URL =
    process.env.SUPABASE_URL;

  const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    return res.status(500).json({
      ok: false,
      message: "서버 환경설정이 필요합니다."
    });
  }

  try {
    const url =
      `${SUPABASE_URL}/rest/v1/property_requests` +
      `?request_number=eq.${encodeURIComponent(requestNumber)}` +
      `&status=eq.OPEN` +
      `&select=request_number,request_type,sido,sigungu,dong,apartment,size,sale_min,sale_max,jeonse_min,jeonse_max,monthly_deposit_min,monthly_deposit_max,monthly_rent,move_date,move_flexible,memo,status` +
      `&limit=1`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization:
          `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Accept: "application/json"
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "property-request-lookup error:",
        data
      );

      return res.status(500).json({
        ok: false,
        message: "요청정보 조회에 실패했습니다."
      });
    }

    if (
      !Array.isArray(data) ||
      data.length === 0
    ) {
      return res.status(404).json({
        ok: false,
        message: "등록된 매수요청번호가 없습니다."
      });
    }

    const item = data[0];

    return res.status(200).json({
      ok: true,

      request: {
        requestNumber:
          item.request_number,

        requestType:
          item.request_type,

        sido:
          item.sido || "",

        sigungu:
          item.sigungu || "",

        dong:
          item.dong || "",

        apartment:
          item.apartment || "",

        size:
          item.size || "",

        saleMin:
          item.sale_min,

        saleMax:
          item.sale_max,

        jeonseMin:
          item.jeonse_min,

        jeonseMax:
          item.jeonse_max,

        monthlyDepositMin:
          item.monthly_deposit_min,

        monthlyDepositMax:
          item.monthly_deposit_max,

        monthlyRent:
          item.monthly_rent,

        moveDate:
          item.move_date || "",

        moveFlexible:
          item.move_flexible === true,

        memo:
          item.memo || "",

        status:
          item.status
      }
    });

  } catch (error) {
    console.error(
      "property-request-lookup exception:",
      error
    );

    return res.status(500).json({
      ok: false,
      message: "서버 오류가 발생했습니다."
    });
  }
}
