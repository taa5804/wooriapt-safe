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


  const normalizePhone =
    value =>
      String(value || "")
        .replace(/\D/g, "");


  const cleanText =
    value =>
      String(value ?? "")
        .trim();


  const isMobilePhone =
    value =>
      /^01[016789][0-9]{7,8}$/
        .test(
          normalizePhone(value)
        );


  function shuffle(items) {

    const arr =
      [...items];


    for (
      let i = arr.length - 1;
      i > 0;
      i--
    ) {

      const j =
        Math.floor(
          Math.random() *
          (i + 1)
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

        .filter(
          item => {

            const phone =
              normalizePhone(
                item.phone
              );


            return (
              phone &&
              !sent.has(phone) &&
              item.receive_blocked !== true
            );
          }
        )

        .sort(
          (a, b) => {

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


            return (
              aDate -
              bDate
            );
          }
        );


    const candidateSize =
      Math.min(
        eligible.length,
        Math.max(
          count * 3,
          count
        )
      );


    return shuffle(
      eligible.slice(
        0,
        candidateSize
      )
    )
    .slice(
      0,
      count
    );
  }


  async function supabaseGet(path) {

    const response =
      await fetch(
        `${SUPABASE_URL}/rest/v1/${path}`,
        {

          method:
            "GET",

          headers:
            supabaseHeaders
        }
      );


    const data =
      await response.json();


    if (
      !response.ok
    ) {

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

    if (
      !rows.length
    ) {
      return [];
    }


    const response =
      await fetch(
        `${SUPABASE_URL}/rest/v1/${table}`,
        {

          method:
            "POST",

          headers: {
            ...supabaseHeaders,
            Prefer:
              "return=representation"
          },

          body:
            JSON.stringify(
              rows
            )
        }
      );


    const data =
      await response.json();


    if (
      !response.ok
    ) {

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

          method:
            "PATCH",

          headers: {
            ...supabaseHeaders,
            Prefer:
              "return=representation"
          },

          body:
            JSON.stringify(
              values
            )
        }
      );


    const data =
      await response.json();


    if (
      !response.ok
    ) {

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


  function tradeTypeText(
    requestType
  ) {

    if (
      requestType === "sale"
    ) {
      return "매매";
    }


    if (
      requestType === "jeonse"
    ) {
      return "전세";
    }


    return "월세";
  }


  function toWon(value) {

    const number =
      Number(value);


    if (
      !Number.isFinite(
        number
      )
    ) {
      return null;
    }


    return (
      number < 1000000
        ? number * 10000
        : number
    );
  }


  function formatMoney(value) {

    const won =
      toWon(value);


    if (
      won === null
    ) {
      return "";
    }


    const eok =
      Math.floor(
        won /
        100000000
      );


    const man =
      Math.floor(
        (
          won %
          100000000
        ) /
        10000
      );


    if (
      eok > 0 &&
      man > 0
    ) {

      return (
        `${eok}억 ` +
        `${man.toLocaleString("ko-KR")}만원`
      );
    }


    if (
      eok > 0
    ) {

      return (
        `${eok}억원`
      );
    }


    return (
      `${man.toLocaleString("ko-KR")}만원`
    );
  }


  function formatRange(
    min,
    max
  ) {

    const minText =
      formatMoney(min);


    const maxText =
      formatMoney(max);


    if (
      !minText &&
      !maxText
    ) {
      return "";
    }


    if (
      !minText
    ) {
      return `${maxText} 이하`;
    }


    if (
      !maxText
    ) {
      return `${minText} 이상`;
    }


    if (
      Number(min) ===
      Number(max)
    ) {
      return minText;
    }


    return (
      `${minText}부터 ${maxText}까지`
    );
  }


  function desiredPriceText(
    request
  ) {

    if (
      request.request_type ===
      "sale"
    ) {

      return formatRange(
        request.sale_min,
        request.sale_max
      );
    }


    if (
      request.request_type ===
      "jeonse"
    ) {

      return formatRange(
        request.jeonse_min,
        request.jeonse_max
      );
    }


    const deposit =
      formatRange(
        request.monthly_deposit_min,
        request.monthly_deposit_max
      );


    const rent =
      formatMoney(
        request.monthly_rent
      );


    return [

      deposit
        ? `보증금 ${deposit}`
        : "",

      rent
        ? `월세 ${rent}`
        : ""

    ]
    .filter(Boolean)
    .join(", ");
  }


  function formatMoveDate(
    value,
    flexible
  ) {

    const text =
      cleanText(value);


    let result =
      text;


    const match =
      text.match(
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/
      );


    if (
      match
    ) {

      result =
        `${match[1]}년 ` +
        `${Number(match[2])}월 ` +
        `${Number(match[3])}일`;
    }


    if (
      flexible &&
      result
    ) {

      return (
        `${result} 전후 협의 가능`
      );
    }


    if (
      flexible
    ) {
      return "협의 가능";
    }


    return result;
  }


  function formatArea(value) {

    const text =
      cleanText(value);


    if (
      !text
    ) {
      return "";
    }


    if (
      /평|㎡|제곱미터/
        .test(text)
    ) {
      return text;
    }


    return `${text}평`;
  }


  function requestDetails(
    request
  ) {

    return {

      dong:
        cleanText(
          request.dong
        ),

      apartment_name:
        cleanText(
          request.apartment
        ),

      trade_type:
        tradeTypeText(
          request.request_type
        ),

      desired_area:
        formatArea(
          request.size
        ),

      desired_price:
        desiredPriceText(
          request
        ),

      move_in_date:
        formatMoveDate(
          request.move_date,
          request.move_flexible === true
        ),

      request_number:
        cleanText(
          request.request_number
        )
    };
  }


  function buildLmsContent(
    request
  ) {

    const d =
      requestDetails(
        request
      );


    const target =
      [
        d.dong,
        d.apartment_name,
        "아파트",
        d.trade_type,
        "희망자가 있습니다."
      ]

      .filter(Boolean)

      .join(" ")

      .replace(
        /아파트\s+아파트/g,
        "아파트"
      );


    const lines = [
      "[매수 희망조건 전달]",
      "",
      target
    ];


    if (
      d.desired_area
    ) {

      lines.push(
        `희망평수: ${d.desired_area}`
      );
    }


    if (
      d.desired_price
    ) {

      lines.push(
        `희망가격: ${d.desired_price}`
      );
    }


    if (
      d.move_in_date
    ) {

      lines.push(
        `입주시기: ${d.move_in_date}`
      );
    }


    lines.push(

      "",

      "조건에 맞는 매물이 있으면 제안해 주세요.",

      `매수요청번호: ${d.request_number}`,

      "바로 확인: https://wooriapt.app",

      "",

      "발송자: 우리아파트 안심거래"
    );


    return lines.join("\n");
  }


  async function sendLms(
    baseUrl,
    phone,
    request
  ) {

    const response =
      await fetch(
        `${baseUrl}/api/send-sms`,
        {

          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              phone:
                normalizePhone(
                  phone
                ),

              content:
                buildLmsContent(
                  request
                ),

              type:
                "LMS",

              subject:
                "매수 희망조건 전달"
            })
        }
      );


    const data =
      await response
        .json()
        .catch(
          () => null
        );


    if (
      !response.ok
    ) {

      console.error(
        "LMS send error:",
        phone,
        data
      );


      throw new Error(
        "LMS_SEND_FAILED"
      );
    }


    return data;
  }


  async function createClawOpsBatch(
    brokers,
    request
  ) {

    if (
      !brokers.length
    ) {
      return null;
    }


    const details =
      requestDetails(
        request
      );


    const tasks =
      brokers.map(
        broker => ({

          To:
            normalizePhone(
              broker.phone
            ),

          Variables:
            details
        })
      );


    const response =
      await fetch(

        `https://api.claw-ops.com/v1/accounts/${CLAWOPS_ACCOUNT_ID}/call-batches`,

        {

          method:
            "POST",

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


    if (
      !response.ok
    ) {

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
      Number(
        body.round
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


    /*
      1차 / 2차 / 3차만 허용
    */

    if (
      ![
        1,
        2,
        3
      ].includes(round)
    ) {

      return res.status(400).json({
        ok: false,
        message:
          "요청 차수를 확인해 주세요."
      });
    }


    const requests =
      await supabaseGet(

        "property_requests" +

        `?request_number=eq.${encodeURIComponent(requestNumber)}` +

        "&status=eq.OPEN&select=*&limit=1"
      );


    if (
      !Array.isArray(
        requests
      ) ||
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


    const currentRound =
      Number(
        request.ars_round || 0
      );


    /*
      같은 차수 재실행 방지
      순서대로만 실행
    */

    if (
      currentRound >= round
    ) {

      return res.status(409).json({
        ok: false,
        message:
          "이미 실행된 요청입니다."
      });
    }


    if (
      round > 1 &&
      currentRound !==
        round - 1
    ) {

      return res.status(409).json({
        ok: false,
        message:
          "이전 요청이 완료된 후 실행해 주세요."
      });
    }


    const logs =
      await supabaseGet(

        "ars_dispatch_logs" +

        `?request_number=eq.${encodeURIComponent(requestNumber)}` +

        "&select=broker_phone,call_status,round_no"
      );


    const alreadySentPhones =
      Array.isArray(logs)

        ? logs

            .filter(
              item =>
                item.call_status !==
                "LMS_FAILED"
            )

            .map(
              item =>
                normalizePhone(
                  item.broker_phone
                )
            )

        : [];


    const blockedRows =
      await supabaseGet(
        "ars_opt_outs?select=phone"
      )
      .catch(
        () => []
      );


    const blockedPhones =
      new Set(

        (
          Array.isArray(
            blockedRows
          )
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


    let selectedMembers =
      [];


    let selectedNonMembers =
      [];


    /*
      1차:
      회원 공인중개사만 자동 알림

      2차 / 3차:
      비회원 최대 30명
    */

    if (
      round === 1
    ) {

      const members =
        await supabaseGet(

          "safe_brokers" +

          `?dong=eq.${encodeURIComponent(request.dong)}` +

          "&membership_status=eq.ACTIVE&is_active=eq.true" +

          "&select=id,mobile_phone,office_name,membership_status,is_active,created_at"
        );


      selectedMembers =
        (
          Array.isArray(
            members
          )
            ? members
            : []
        )

        .filter(
          item => {

            const phone =
              normalizePhone(
                item.mobile_phone
              );


            return (
              isMobilePhone(phone) &&
              !blockedPhones.has(phone) &&
              !alreadySentPhones.includes(phone)
            );
          }
        )

        .slice(
          0,
          10
        )

        .map(
          item => ({
            ...item,
            phone:
              item.mobile_phone
          })
        );

    } else {

      const nonMembers =
        await supabaseGet(

          "agent_nonmembers" +

          `?dong=eq.${encodeURIComponent(request.dong)}` +

          "&select=id,phone,office_name,phone_registered_at,created_at,receive_blocked"
        );


      const eligible =
        (
          Array.isArray(
            nonMembers
          )
            ? nonMembers
            : []
        )

        .filter(
          item => {

            const phone =
              normalizePhone(
                item.phone
              );


            return (
              phone &&
              !blockedPhones.has(phone)
            );
          }
        );


      selectedNonMembers =
        selectNonMembers(
          eligible,
          alreadySentPhones,
          30
        );
    }


    const selected = [

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


    /*
      해당 차수에 발송할 중개사가 없어도
      차수는 완료 처리
    */

    if (
      selected.length === 0
    ) {

      const nextArsAt =
        new Date(
          Date.now() +
          2 *
          60 *
          60 *
          1000
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

        ok:
          true,

        action:
          "STOP",

        reason:
          "NO_MORE_BROKERS",

        round:
          round,

        nextArsAt:
          nextArsAt
      });
    }


    const mobileRecipients =
      selected.filter(
        item =>
          isMobilePhone(
            item.phone
          )
      );


    const voiceRecipients =
      selected.filter(
        item =>
          !isMobilePhone(
            item.phone
          )
      );


    const protocol =
      req.headers[
        "x-forwarded-proto"
      ] || "https";


    const host =
      req.headers.host;


    if (
      !host
    ) {

      throw new Error(
        "HOST_NOT_FOUND"
      );
    }


    const baseUrl =
      `${protocol}://${host}`;


    const lmsResults =
      await Promise.all(

        mobileRecipients.map(

          async broker => {

            try {

              await sendLms(
                baseUrl,
                broker.phone,
                request
              );


              return {
                broker,
                ok: true
              };

            } catch (
              error
            ) {

              return {
                broker,
                ok: false
              };
            }
          }
        )
      );


    const batch =
      await createClawOpsBatch(
        voiceRecipients,
        request
      );


    const batchId =
      batch?.Id ||
      batch?.id ||
      batch?.BatchId ||
      batch?.batchId ||
      null;


    const now =
      new Date()
        .toISOString();


    const logRows = [

      ...lmsResults.map(
        item => ({

          request_number:
            requestNumber,

          broker_id:
            item.broker.id
              ? String(
                  item.broker.id
                )
              : null,

          broker_type:
            item.broker.broker_type,

          broker_phone:
            normalizePhone(
              item.broker.phone
            ),

          broker_office:
            item.broker.office_name ||
            null,

          round_no:
            round,

          clawops_batch_id:
            null,

          call_status:
            item.ok
              ? "LMS_SENT"
              : "LMS_FAILED",

          sent_at:
            item.ok
              ? now
              : null
        })
      ),


      ...voiceRecipients.map(
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
            broker.office_name ||
            null,

          round_no:
            round,

          clawops_batch_id:
            batchId
              ? String(
                  batchId
                )
              : null,

          call_status:
            "PAUSED",

          sent_at:
            null
        })
      )
    ];


    await supabaseInsert(
      "ars_dispatch_logs",
      logRows
    );


    const nextArsAt =
      new Date(
        Date.now() +
        2 *
        60 *
        60 *
        1000
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

      ok:
        true,

      action:
        "NOTIFICATIONS_CREATED",

      requestNumber:
        requestNumber,

      round:
        round,

      memberCount:
        selectedMembers.length,

      nonMemberCount:
        selectedNonMembers.length,

      lmsSentCount:
        lmsResults.filter(
          item => item.ok
        ).length,

      lmsFailedCount:
        lmsResults.filter(
          item => !item.ok
        ).length,

      arsCount:
        voiceRecipients.length,

      total:
        selected.length,

      batchId:
        batchId,

      nextArsAt:
        nextArsAt
    });


  } catch (
    error
  ) {

    console.error(
      "ars-batch error:",
      error
    );


    return res.status(500).json({

      ok:
        false,

      message:
        "매수요청 알림 생성 중 오류가 발생했습니다."
    });
  }
}
