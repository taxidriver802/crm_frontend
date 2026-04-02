import { NextResponse } from "next/server";
import { API_BASE } from "@/lib/helper";

async function handler(req, { params }) {
  const path = params.path || [];

  const search = new URL(req.url).search;
  const target = `${API_BASE}/notifications/${path.join("/")}${search}`;

  try {
    const res = await fetch(target, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        // 🔑 CRITICAL: forward cookies for auth
        cookie: req.headers.get("cookie") || "",
      },
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.text(),
      cache: "no-store",
    });

    const text = await res.text();

    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (err) {
    console.error("Notifications proxy error:", err);

    return NextResponse.json({ error: "Proxy failed" }, { status: 500 });
  }
}

export const GET = handler;
export const PATCH = handler;
export const POST = handler;
export const DELETE = handler;
