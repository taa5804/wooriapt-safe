"use strict";

function xml(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

async function getPage(origin, pageNo, rows) {
  const response = await fetch(`${origin}/api/apt-list?pageNo=${pageNo}&numOfRows=${rows}`);
  if (!response.ok) throw new Error("apt-list error");
  const data = await response.json();
  if (!data || data.ok !== true) throw new Error("apt-list response error");
  return data;
}

module.exports = async function handler(req, res) {
  const origin = "https://www.wooriapt.app";
  const page = Math.max(0, Number.parseInt(req.query.page || "0", 10) || 0);
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");

  try {
    if (page === 0) {
      const first = await getPage(origin, 1, 1);
      const count = Number(first.totalCount || 0);
      const pages = Math.max(1, Math.ceil(count / 1000));
      const items = Array.from({length: pages}, (_, i) => `<sitemap><loc>${origin}/api/sitemap?page=${i + 1}</loc></sitemap>`).join("");
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</sitemapindex>`);
    }

    const data = await getPage(origin, page, 1000);
    const apartments = Array.isArray(data.apartments) ? data.apartments : [];
    const types = ["sale", "jeonse", "monthly"];
    const urls = [];
    for (const item of apartments) {
      for (const type of types) {
        const p = new URLSearchParams({type,region:item.region || "",city:item.city || "",dong:item.dong || "",apt:item.kaptName || "아파트"});
        urls.push(`<url><loc>${xml(origin + "/api/apt-seo?" + p.toString())}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`);
      }
    }
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`);
  } catch (error) {
    return res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?><error>temporary sitemap error</error>`);
  }
};
