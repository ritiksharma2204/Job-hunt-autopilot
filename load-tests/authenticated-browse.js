// Simulates authenticated users browsing already-cached job listings
// (GET /jobs) - this hits the database but NOT Adzuna or Groq, so it's
// safe to run at higher volume without burning through those free-tier
// rate limits.
//
// Requires a real Supabase JWT for a test user (get one from test-login.html).
// Run: k6 run --env BASE_URL=https://your-render-url.onrender.com --env TOKEN=your-jwt authenticated-browse.js

import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";
const TOKEN = __ENV.TOKEN;

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "1m", target: 30 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  const params = {
    headers: { Authorization: `Bearer ${TOKEN}` },
  };
  const res = http.get(`${BASE_URL}/jobs`, params);
  check(res, {
    "status is 200": (r) => r.status === 200,
  });
  sleep(1);
}