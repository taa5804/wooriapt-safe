export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      message: "허용되지 않은 요청입니다."
    });
  }

  const SUPABASE_URL =
    process.env.SUPABASE_URL;

  const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  const CLAWOPS_ACCOUNT_ID =
    process.env.CLAWOPS_ACCOUNT_ID;

  const CLAWOPS_API_KEY =
    process.env.CLAWOPS_API_KEY;

  const CLAWOPS_FROM_NUMBER =
    process.env.CLAWOPS_FROM_NUMBER;

  const CLAWOPS_CALL_FLOW_ID =
    process.env.CLAWOPS_CALL_FLOW_ID;


  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY ||
    !CLAWOPS_ACCOUNT_ID ||
    !CLAWOPS_API_KEY ||
    !CLAWOPS_FROM_NUMBER ||
    !CLAWOPS_CALL_FLOW_ID
  ) {
    return res.status(500).json({
      ok: false,
      message: "서버 환경설정이 필요합니다."
    });
  }


  const supabaseHeaders = {
    apikey:
      SUPABASE_SERVICE_ROLE_KEY,

    Authorization:
      `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,

    "Content-Type":
      "application/json"
  };


  function normalizePhone(value) {
    return String(value || "")
      .replace(/\D/g, "");
  }


  function shuffle(items) {

    const arr = [...items];

    for (
      let i = arr.length - 1;
      i > 0;
      i--
    ) {

      const j =
        Math.floor(
          Math.random() * (i + 1)
        );

      [
        arr[i],
        arr[j]
      ] = [
        arr[j],
        arr[i]
      ];
    }

    return arr;
  }


  function selectNonMembers(
    nonMembers,
    alreadySentPhones,
    count
  ) {

    const sent =
      new Set(
        alreadySentPhones.map(
          normalizePhone
        )
      );

    const eligible =
      nonMembers
      .filter(item => {

        const phone =
          normalizePhone(
            item.phone
          );

        return (
          phone &&
          !sent.has(phone) &&
          item.receive_blocked !== true
        );

      })
      .sort((a, b) => {

        const aDate =
          new Date(
            a.phone_registered_at ||
            a.created_at ||
            0
          ).getTime();

        const bDate =
          new Date(
            b.phone_registered_at ||
            b.created_at ||
            0
          ).getTime();

        return aDate - bDate;
      });


    const candidateSize =
      Math.min(
        eligible.length,
        Math.max(
          count * 3,
          count
        )
      );


    const candidates =
      eligible.slice(
        0,
        candidateSize
      );


    return shuffle(
      candidates
    ).slice(
      0,
      count
    );
  }


  async function supabaseGet(
    path
  ) {

    const response =
      await fetch(
        `${SUPABASE_URL}/rest/v1/${path}`,
        {
          method: "GET",
          headers:
            supabaseHeaders
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        "Supabase GET error:",
        data
      );

      throw new Error(
        "SUPABASE_GET_FAILED"
      );
    }

    return data;
  }


  async function supabaseInsert(
    table,
    rows
  ) {

    const response =
      await fetch(
        `${SUPABASE_URL}/rest/v1/${table}`,
        {
          method: "POST",

          headers: {
            ...supabaseHeaders,
            Prefer:
              "return=representation"
          },

          body:
            JSON.stringify(rows)
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        "Supabase INSERT error:",
        data
      );

      throw new Error(
        "SUPABASE_INSERT_FAILED"
      );
    }

    return data;
  }


  async function supabasePatch(
    table,
    query,
    values
  ) {

    const response =
      await fetch(
        `${SUPABASE_URL}/rest/v1/${table}?${query}`,
        {
          method: "PATCH",

          headers: {
            ...supabaseHeaders,
            Prefer:
              "return=representation"
          },

          body:
            JSON.stringify(values)
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        "Supabase PATCH error:",
        data
      );

      throw new Error(
        "SUPABASE_PATCH_FAILED"
      );
    }

    return data;
  }


  async function createClawOpsBatch(
    brokers,
    request
  ) {

    if (!brokers.length) {
      return null;
    }


    const tasks =
      brokers.map(
        broker => ({

          To:
            normalizePhone(
              broker.phone
            ),

          Variables: {

            dong:
              String(
                request.dong || ""
              ),

            trade_type:
              request.request_type === "sale"
                ? "매매"
                : request.request_type === "jeonse"
                  ? "전세"
                  : "월세",

            request_number:
              String(
                request.request_number || ""
              )
          }
        })
      );


    const url =
      `https://api.claw-ops.com/v1/accounts/` +
      `${CLAWOPS_ACCOUNT_ID}/call-batches`;


    const response =
      await fetch(
        url,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${CLAWOPS_API_KEY}`,

            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              Name:
                `안심거래-${request.request_number}`,

              From:
                CLAWOPS_FROM_NUMBER,

              CallFlowId:
                CLAWOPS_CALL_FLOW_ID,

              Status:
                "paused",

              MachineDetection:
                "Enable",

              Tasks:
                tasks
            })
        }
      );


    const data =
      await response.json();

    if (!response.ok) {

      console.error(
        "ClawOps batch error:",
        data
      );

      throw new Error(
        "CLAWOPS_BATCH_FAILED"
      );
    }


    return data;
  }


  try {

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : (req.body || {});


    const requestNumber =
      String(
        body.requestNumber || ""
      )
      .replace(/\D/g, "")
      .slice(0, 4);


    const round =
      Math.max(
        1,
        Number(
          body.round || 1
        )
      );


    if (
      requestNumber.length !== 4
    ) {

      return res.status(400).json({
        ok: false,
        message:
          "4자리 매수요청번호를 확인해 주세요."
      });
    }


    const requests =
      await supabaseGet(
        "property_requests" +
        `?request_number=eq.${encodeURIComponent(requestNumber)}` +
        "&status=eq.OPEN" +
        "&select=*" +
        "&limit=1"
      );


    if (
      !Array.isArray(requests) ||
      requests.length === 0
    ) {

      return res.status(404).json({
        ok: false,
        message:
          "진행 중인 매수요청을 찾을 수 없습니다."
      });
    }


    const request =
      requests[0];


    if (
      Number(
        request.proposal_count || 0
      ) >= 3
    ) {

      return res.status(200).json({
        ok: true,
        action: "STOP",
        reason:
          "ENOUGH_PROPOSALS",
        proposalCount:
          Number(
            request.proposal_count || 0
          )
      });
    }


    const logs =
      await supabaseGet(
        "ars_dispatch_logs" +
        `?request_number=eq.${encodeURIComponent(requestNumber)}` +
        "&select=broker_phone"
      );


    const alreadySentPhones =
      Array.isArray(logs)
        ? logs.map(
            item =>
              normalizePhone(
                item.broker_phone
              )
          )
        : [];


    const blockedRows =
      await supabaseGet(
        "ars_opt_outs" +
        "?select=phone"
      )
      .catch(() => []);


    const blockedPhones =
      new Set(
        (
          Array.isArray(blockedRows)
            ? blockedRows
            : []
        )
        .map(
          item =>
            normalizePhone(
              item.phone
            )
        )
      );


    let selectedMembers = [];
    let selectedNonMembers = [];


    if (round === 1) {

      const members =
        await supabaseGet(
          "agent_members" +
          `?dong=eq.${encodeURIComponent(request.dong)}` +
          "&membership_status=eq.ACTIVE" +
          "&select=id,phone,office_name,membership_status,created_at"
        );


      selectedMembers =
        (
          Array.isArray(members)
            ? members
            : []
        )
        .filter(item => {

          const phone =
            normalizePhone(
              item.phone
            );

          return (
            phone &&
            !blockedPhones.has(phone) &&
            !alreadySentPhones.includes(
              phone
            )
          );
        });


      const shortage =
        Math.max(
          0,
          10 -
          selectedMembers.length
        );


      if (shortage > 0) {

        const nonMembers =
          await supabaseGet(
            "agent_nonmembers" +
            `?dong=eq.${encodeURIComponent(request.dong)}` +
            "&select=id,phone,office_name,phone_registered_at,created_at,receive_blocked"
          );


        const eligible =
          (
            Array.isArray(nonMembers)
              ? nonMembers
              : []
          )
          .filter(item => {

            const phone =
              normalizePhone(
                item.phone
              );

            return (
              phone &&
              !blockedPhones.has(phone)
            );
          });


        selectedNonMembers =
          selectNonMembers(
            eligible,
            alreadySentPhones,
            shortage
          );
      }

    } else {

      const nonMembers =
        await supabaseGet(
          "agent_nonmembers" +
          `?dong=eq.${encodeURIComponent(request.dong)}` +
          "&select=id,phone,office_name,phone_registered_at,created_at,receive_blocked"
        );


      const eligible =
        (
          Array.isArray(nonMembers)
            ? nonMembers
            : []
        )
        .filter(item => {

          const phone =
            normalizePhone(
              item.phone
            );

          return (
            phone &&
            !blockedPhones.has(phone)
          );
        });


      selectedNonMembers =
        selectNonMembers(
          eligible,
          alreadySentPhones,
          10
        );
    }


    const selected =
      [
        ...selectedMembers.map(
          item => ({
            ...item,
            broker_type:
              "MEMBER"
          })
        ),

        ...selectedNonMembers.map(
          item => ({
            ...item,
            broker_type:
              "NONMEMBER"
          })
        )
      ];


    if (
      selected.length === 0
    ) {

      return res.status(200).json({
        ok: true,
        action: "STOP",
        reason:
          "NO_MORE_BROKERS"
      });
    }


    const batch =
      await createClawOpsBatch(
        selected,
        request
      );


    const batchId =
      batch?.Id ||
      batch?.id ||
      batch?.BatchId ||
      batch?.batchId ||
      null;


    const logRows =
      selected.map(
        broker => ({

          request_number:
            requestNumber,

          broker_id:
            broker.id
              ? String(
                  broker.id
                )
              : null,

          broker_type:
            broker.broker_type,

          broker_phone:
            normalizePhone(
              broker.phone
            ),

          broker_office:
            broker.office_name || null,

          round_no:
            round,

          clawops_batch_id:
            batchId
              ? String(batchId)
              : null,

          call_status:
            "PAUSED",

          sent_at:
            null
        })
      );


    await supabaseInsert(
      "ars_dispatch_logs",
      logRows
    );


    const nextArsAt =
      new Date(
        Date.now() +
        2 * 60 * 60 * 1000
      )
      .toISOString();


    await supabasePatch(
      "property_requests",
      `request_number=eq.${encodeURIComponent(requestNumber)}`,
      {
        ars_round:
          round,

        next_ars_at:
          nextArsAt
      }
    );


    return res.status(200).json({

      ok: true,

      action:
        "BATCH_CREATED_PAUSED",

      requestNumber:
        requestNumber,

      round:
        round,

      memberCount:
        selectedMembers.length,

      nonMemberCount:
        selectedNonMembers.length,

      total:
        selected.length,

      batchId:
        batchId,

      nextArsAt:
        nextArsAt
    });


  } catch (error) {

    console.error(
      "ars-batch error:",
      error
    );


    return res.status(500).json({
      ok: false,
      message:
        "ARS 배치 생성 중 오류가 발생했습니다."
    });
  }
}
