const INDEXNOW_KEY = "wooriapt-indexnow-2026";
const HOST = "wooriapt.app";
const KEY_LOCATION =
  "https://wooriapt.app/wooriapt-indexnow-2026.txt";

export default async function handler(req, res) {
  // GET: 연결 상태 확인
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      message: "Naver IndexNow API ready",
      host: HOST,
      keyLocation: KEY_LOCATION
    });
  }

  // POST만 허용
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method Not Allowed"
    });
  }

  try {
    let urls = req.body?.urls || req.body?.urlList || [];

    // URL 하나만 문자열로 보내도 처리
    if (typeof urls === "string") {
      urls = [urls];
    }

    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "전송할 URL이 없습니다."
      });
    }

    // wooriapt.app URL만 허용
    urls = [...new Set(urls)]
      .filter((url) => {
        try {
          const u = new URL(url);
          return (
            u.protocol === "https:" &&
            (u.hostname === "wooriapt.app" ||
             u.hostname === "www.wooriapt.app")
          );
        } catch {
          return false;
        }
      })
      .slice(0, 10000);

    if (urls.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "유효한 wooriapt.app URL이 없습니다."
      });
    }

    const payload = {
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: KEY_LOCATION,
      urlList: urls
    };

    const response = await fetch(
      "https://searchadvisor.naver.com/indexnow",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8"
        },
        body: JSON.stringify(payload)
      }
    );

    const responseText = await response.text();

    return res.status(response.status).json({
      ok: response.ok,
      naverStatus: response.status,
      submitted: urls.length,
      response: responseText || "Success"
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}
