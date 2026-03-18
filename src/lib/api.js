const isServer = typeof window === "undefined";

const BASE = isServer
  ? process.env.API_INTERNAL_BASE_URL || "http://localhost:4000"
  : process.env.NEXT_PUBLIC_API_BASE_URL || "";

export async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }

  return data;
}
