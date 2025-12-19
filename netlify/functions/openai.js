exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "Method Not Allowed" };
  }

  try {
    const { prompt } = JSON.parse(event.body || "{}");

    if (!prompt) {
      return { statusCode: 400, headers, body: "Missing prompt" };
    }

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 600,
        }),
      }
    );

    const rawText = await openaiResponse.text();

    // 🔴 If OpenAI returns a non-200, show it
    if (!openaiResponse.ok) {
      return {
        statusCode: openaiResponse.status,
        headers,
        body: JSON.stringify({
          error: "OpenAI API error",
          raw: rawText,
        }),
      };
    }

    const json = JSON.parse(rawText);

    const text =
      json?.choices?.[0]?.message?.content ??
      json?.error?.message ??
      "No content returned from OpenAI";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        text,
        debug: json, // TEMPORARY — remove later
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: err.message,
      }),
    };
  }
};
