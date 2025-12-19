// Simple in-memory rate limiting (MVP-safe)
const RATE_LIMIT = 20; // requests per IP
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

const ipStore = new Map();

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

  // 🔒 Identify client IP
  const ip =
    event.headers["x-forwarded-for"]?.split(",")[0] ||
    event.headers["client-ip"] ||
    "unknown";

  const now = Date.now();
  const record = ipStore.get(ip) || { count: 0, start: now };

  // Reset window if expired
  if (now - record.start > WINDOW_MS) {
    record.count = 0;
    record.start = now;
  }

  // Enforce rate limit
  if (record.count >= RATE_LIMIT) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({
        error: "Usage limit reached",
        message:
          "You’ve reached the free usage limit. Join early access to continue.",
      }),
    };
  }

  // Increment count
  record.count += 1;
  ipStore.set(ip, record);

  try {
    const { prompt } = JSON.parse(event.body || "{}");

    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: "Missing prompt",
      };
    }

    const response = await fetch(
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

    const json = await response.json();
    const text = json?.choices?.[0]?.message?.content || "No response";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
