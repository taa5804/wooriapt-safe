"use strict";

const SUPABASE_URL = "https://dcysjuxyjqtvkihdsjvv.supabase.co";
const SUPABASE_KEY = "sb_publishable_RZBX7u1v8MLBCfEJT0-eRg_jPcIulG2";
const INDEXNOW_KEY = "fc1e3ad82010475381daf9846e627fdd";

function clean(v) { return String(v || "").trim(); }
function pathEncode(v) { return encodeURIComponent(clean(v)); }

module.exports = async function handler(req, res) {
  try {
    const response = await fetch(
      SUPABASE_URL + "/rest/v1/safe_apartments?select=시도,시군구,동리,읍면,단지명",
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: "Bearer " + SUPABASE_KEY,
          Range: "0-499"
        }
      }
    );

    if (!response.ok) {
      return res.status(502).send("데이터 조회 실패");
    }

    const rows = await response.json();
    const paths = [
      "/",
      "/apt",
      "/mart",
      "/price",
      "/aura",
      "/check",
      "/map",
      "/broker-signup",
      "/broker-guide",
      "/app-install",
      "/broker-landing.html",
      "/mart-landing.html"
    ];

    for (const row of rows) {
      const region = clean(row["시도"]);
      const city = clean(row["시군구"]);
      const place = clean(row["동리"] || row["읍면"]);
      const apt = clean(row["단지명"]);
      if (!region || !city || !place) continue;

      paths.push("/apt-search/" + pathEncode(region) + "/" + pathEncode(city) + "/" + pathEncode(place) + "/sale");
      if (apt) {
        paths.push("/apt-search/" + pathEncode(region) + "/" + pathEncode(city) + "/" + pathEncode(place) + "/" + pathEncode(apt) + "/sale");
      }
      if (paths.length >= 250) break;
    }

    const hosts = ["wooriapt.app", "www.wooriapt.app"];
    const statuses = [];

    for (const host of hosts) {
      const urls = paths.map(p => "https://" + host + p);
      const naverRes = await fetch("https://searchadvisor.naver.com/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host: host,
          key: INDEXNOW_KEY,
          keyLocation: "https://" + host + "/" + INDEXNOW_KEY + ".txt",
          urlList: urls
        })
      });
      statuses.push(host + ": " + naverRes.status);
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).json({ ok: true, count: paths.length, statuses });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
