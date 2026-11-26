const crypto = require("crypto");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  
  const requestId = req.query.requestId;
  const accessKey = process.env.NCP_ACCESS_KEY;
  const secretKey = process.env.NCP_SECRET_KEY;
  const serviceId = "ncp:sms:kr:376942048120:ansimtrade-sms";

  if (!accessKey || !secretKey) {
    return res.status(500).json({ ok: false, message: "NCP API keys missing" });
  }

  // 기본 조회 범위: 최근 3일 (2026-11-24 00:00 ~ 현재)
  const now = new Date();
  const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  
  const formatDate = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  };

  const start = req.query.start || "2026-11-24 00:00";
  const end = req.query.end || "2026-11-26 23:59";

  const timestamp = Date.now().toString();
  const method = "GET";
  const qs = requestId 
    ? `requestId=${requestId}`
    : `requestStartTime=${encodeURIComponent(start)}&requestEndTime=${encodeURIComponent(end)}&pageSize=50`;
  const uri = `/sms/v2/services/${serviceId}/messages?${qs}`;
  
  const signatureMessage = method + " " + uri + "\n" + timestamp + "\n" + accessKey;
  const signature = crypto.createHmac("sha256", secretKey).update(signatureMessage).digest("base64");

  try {
    const response = await fetch(`https://sens.apigw.ntruss.com${uri}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "x-ncp-apigw-timestamp": timestamp,
        "x-ncp-iam-access-key": accessKey,
        "x-ncp-apigw-signature-v2": signature
      }
    });
    const data = await response.json();
    return res.status(200).json({ ok: true, status: response.status, uri, data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
