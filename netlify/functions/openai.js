// Simple in-memory rate limiting (MVP-safe)
const RATE_LIMIT = 20; // requests
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

  // 🔒 Get IP address
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

  // Check limit
  if (record.count >= RATE_LIMIT) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({
        error: "Usage limit reached",
        message:
          "You’ve reached the free
