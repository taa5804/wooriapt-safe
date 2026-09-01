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


  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    return res.status(500).json({
      ok: false,
      message: "서버 환경설정이 필요합니다."
    });
  }


  const headers = {
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


  function cleanText(value) {
    return String(value ?? "")
      .trim();
  }


  function getFirstValue(
    object,
    keys
  ) {

    for (const key of keys) {

      if (
        object &&
        object[key] !== undefined &&
        object[key] !== null &&
        object[key] !== ""
      ) {
        return object[key];
      }
    }

    return "";
  }


  async function supabaseGet(path) {

    const response =
      await fetch(
        `${SUPABASE_URL}/rest/v1/${path}`,
        {
          method: "GET",
          headers
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
            ...headers,
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


  async function supabaseInsert(
    table,
    values
  ) {

    const response =
      await fetch(
        `${SUPABASE_URL}/rest/v1/${table}`,
        {
          method: "POST",

          headers: {
            ...headers,
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
        "Supabase INSERT error:",
        data
      );

      throw new Error(
        "SUPABASE_INSERT_FAILED"
      );
    }

    return data;
  }


  try {

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : (req.body || {});


    const payload =
      body.data ||
      body.Data ||
      body;


    const variables =
      payload.Variables ||
      payload.variables ||
      body.Variables ||
      body.variables ||
      {};


    const requestNumber =
      cleanText(
        getFirstValue(
          variables,
          [
            "request_number",
            "requestNumber"
          ]
        ) ||
        getFirstValue(
          payload,
          [
            "request_number",
            "requestNumber"
          ]
        )
      )
      .replace(/\D/g, "")
      .slice(0, 4);


    const phone =
      normalizePhone(
        getFirstValue(
          payload,
          [
            "To",
            "to",
            "Phone",
            "phone",
            "PhoneNumber",
            "phoneNumber",
            "callee",
            "destination"
          ]
        )
      );


    const taskId =
      cleanText(
        getFirstValue(
          payload,
          [
            "TaskId",
            "taskId",
            "task_id",
            "Id",
            "id"
          ]
        )
      );


    const batchId =
      cleanText(
        getFirstValue(
          payload,
          [
            "BatchId",
            "batchId",
            "batch_id",
            "CallBatchId",
            "callBatchId"
          ]
        )
      );


    const callStatus =
      cleanText(
        getFirstValue(
          payload,
          [
            "Status",
            "status",
            "CallStatus",
            "callStatus",
            "Result",
            "result"
          ]
        )
      )
      .toUpperCase();


    let dtmf =
      cleanText(
        getFirstValue(
          payload,
          [
            "Dtmf",
            "dtmf",
            "DTMF",
            "Digit",
            "digit",
            "Digits",
            "digits",
            "Key",
            "key",
            "PressedKey",
            "pressedKey"
          ]
        )
      );


    if (!dtmf) {

      dtmf =
        cleanText(
          getFirstValue(
            variables,
            [
              "dtmf",
              "digit",
              "digits",
              "pressed_key",
              "pressedKey"
            ]
          )
        );
    }


    dtmf =
      dtmf.replace(/[^0-9*#]/g, "")
      .slice(0, 1);


    let logRows = [];


    if (phone) {

      logRows =
        await supabaseGet(
          "ars_dispatch_logs" +
          `?broker_phone=eq.${encodeURIComponent(phone)}` +
          (
            requestNumber
              ? `&request_number=eq.${encodeURIComponent(requestNumber)}`
              : ""
          ) +
          "&order=created_at.desc" +
          "&limit=1"
        );

    } else if (taskId) {

      logRows =
        await supabaseGet(
          "ars_dispatch_logs" +
          `?clawops_task_id=eq.${encodeURIComponent(taskId)}` +
          "&order=created_at.desc" +
          "&limit=1"
        );
    }


    const log =
      Array.isArray(logRows) &&
      logRows.length
        ? logRows[0]
        : null;


    const finalRequestNumber =
      requestNumber ||
      cleanText(
        log?.request_number
      );


    const finalPhone =
      phone ||
      normalizePhone(
        log?.broker_phone
      );


    if (!log) {

      return res.status(200).json({
        ok: true,
        ignored: true,
        message:
          "일치하는 ARS 발신기록이 없습니다."
      });
    }


    const patchValues = {};


    if (taskId) {
      patchValues.clawops_task_id =
        taskId;
    }


    if (batchId) {
      patchValues.clawops_batch_id =
        batchId;
    }


    if (callStatus) {
      patchValues.call_status =
        callStatus;
    }


    if (dtmf) {
      patchValues.dtmf_result =
        dtmf;
    }


    if (
      Object.keys(
        patchValues
      ).length
    ) {

      await supabasePatch(
        "ars_dispatch_logs",
        `id=eq.${encodeURIComponent(log.id)}`,
        patchValues
      );
    }


    if (dtmf === "1") {

      await supabasePatch(
        "ars_dispatch_logs",
        `id=eq.${encodeURIComponent(log.id)}`,
        {
          dtmf_result:
            "1",

          call_status:
            "PROPOSAL_AVAILABLE"
        }
      );


      return res.status(200).json({
        ok: true,
        action:
          "PROPOSAL_AVAILABLE",

        requestNumber:
          finalRequestNumber,

        phone:
          finalPhone
      });
    }


    if (dtmf === "2") {

      if (finalPhone) {

        const existingOptOut =
          await supabaseGet(
            "ars_opt_outs" +
            `?phone=eq.${encodeURIComponent(finalPhone)}` +
            "&select=id" +
            "&limit=1"
          );


        if (
          !Array.isArray(
            existingOptOut
          ) ||
          existingOptOut.length === 0
        ) {

          await supabaseInsert(
            "ars_opt_outs",
            {
              phone:
                finalPhone,

              reason:
                "DTMF_2",

              request_number:
                finalRequestNumber || null,

              created_at:
                new Date()
                .toISOString()
            }
          );
        }
      }


      await supabasePatch(
        "ars_dispatch_logs",
        `id=eq.${encodeURIComponent(log.id)}`,
        {
          dtmf_result:
            "2",

          call_status:
            "OPT_OUT"
        }
      );


      return res.status(200).json({
        ok: true,
        action:
          "OPT_OUT",

        phone:
          finalPhone
      });
    }


    return res.status(200).json({
      ok: true,

      action:
        "CALL_RESULT_SAVED",

      requestNumber:
        finalRequestNumber,

      phone:
        finalPhone,

      status:
        callStatus || null,

      dtmf:
        dtmf || null
    });


  } catch (error) {

    console.error(
      "ars-result error:",
      error
    );


    return res.status(500).json({
      ok: false,
      message:
        "ARS 결과 처리 중 오류가 발생했습니다."
    });
  }
}
