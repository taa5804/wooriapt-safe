"use strict";

function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function typeName(type) {
  if (type === "jeonse") return "전세";
  if (type === "monthly") return "월세";
  return "매매";
}

module.exports = function handler(req, res) {
  const q = req.query || {};
  const region = String(q.region || "").trim();
  const city = String(q.city || "").trim();
  const dong = String(q.dong || "").trim();
  const apt = String(q.apt || "아파트").trim();
  const type = ["sale", "jeonse", "monthly"].includes(q.type) ? q.type : "sale";
  const trade = typeName(type);
  const place = [region, city, dong].filter(Boolean).join(" ");
  const subject = [dong || city || region, apt, trade].filter(Boolean).join(" ");
  const full = [place, apt, trade].filter(Boolean).join(" ");
  const origin = "https://www.wooriapt.app";
  const params = new URLSearchParams({ type, region, city, dong, apt });
  const canonical = origin + "/api/apt-seo?" + params.toString();
  const apply = origin + "/request.html?" + params.toString();
  const landing = origin + "/apt.html?" + params.toString();
  const description = `${full}을 찾고 계신가요? 희망가격과 조건을 등록하면 해당 지역 공인중개사의 맞춤 매물 제안을 비교할 수 있습니다.`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
  res.status(200).send(`<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(subject)} | 우리아파트 안심거래</title>
<meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${esc(subject)} | 우리아파트 안심거래"><meta property="og:description" content="${esc(description)}">
<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"WebPage",name:`${subject} | 우리아파트 안심거래`,description,url:canonical,inLanguage:"ko-KR"}).replace(/</g, "\\u003c")}</script>
<style>*{box-sizing:border-box}body{margin:0;background:#f4f7fa;color:#172b3d;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans KR",Arial,sans-serif}.wrap{max-width:760px;margin:auto;padding:18px 14px 55px}.brand{display:block;margin-bottom:18px;color:#173a59;font-size:20px;font-weight:900}.brand strong{color:#1165d7}.hero{overflow:hidden;border:1px solid #dce5ec;border-radius:20px;background:#fff;box-shadow:0 7px 22px rgba(22,56,83,.07)}.top{padding:30px 22px;background:linear-gradient(135deg,#0f5fcf,#2381e7);color:#fff}.loc{font-size:14px;font-weight:800;opacity:.92}h1{margin:9px 0 0;font-size:30px;line-height:1.4}.body{padding:25px 20px 28px}.body h2{font-size:21px;color:#173e60}.body p{color:#627889;line-height:1.75}.cta{display:flex;align-items:center;justify-content:center;min-height:57px;margin-top:20px;border-radius:12px;background:#1165d7;color:#fff;text-decoration:none;font-size:17px;font-weight:900}.more{display:block;margin-top:14px;text-align:center;color:#1165d7;text-decoration:none;font-weight:800}@media(max-width:480px){h1{font-size:25px}.top{padding:25px 17px}.body{padding:21px 15px 24px}}</style>
</head><body><div class="wrap"><a class="brand" href="${origin}/">🏠 우리아파트 <strong>안심거래</strong></a><main class="hero"><section class="top"><div class="loc">${esc(place || "전국 아파트")}</div><h1>${esc(subject)}</h1></section><section class="body"><h2>원하는 아파트, 직접 찾아다니지 마세요.</h2><p>${esc(description)}</p><p>원하는 면적·가격·입주조건을 등록하고 여러 제안을 한곳에서 비교하세요. 매매·전세·월세 모두 이용할 수 있습니다.</p><a class="cta" href="${esc(apply)}">${esc(trade)} 희망조건 등록하기</a><a class="more" href="${esc(landing)}">상세 안내 보기</a></section></main></div></body></html>`);
};
