// Baseline throughput/latency test against the public, unauthenticated
// /health endpoint. This measures raw request-handling capacity of the
// deployed backend, independent of database or LLM costs.
//
// Run: k6 run --env BASE_URL=https://your-render-url.onrender.com health-check.js

import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

export const options = {
  stages: [
    { duration: "30s", target: 20 },   // ramp up to 20 virtual users
    { duration: "1m", target: 50 },    // ramp up to 50 virtual users
    { duration: "1m", target: 100 },   // push to 100 virtual users
    { duration: "30s", target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000"], // 95% of requests should be under 1s
    http_req_failed: ["rate<0.01"],    // less than 1% failure rate
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/health`);
  check(res, {
    "status is 200": (r) => r.status === 200,
  });
  sleep(0.5);
}