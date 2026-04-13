const isServer = typeof window === "undefined";

const BASE = isServer
  ? process.env.API_INTERNAL_BASE_URL || "http://localhost:4000"
  : process.env.NEXT_PUBLIC_API_BASE_URL || "";

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function api(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch (networkErr) {
    throw new ApiError(
      "Network error — please check your connection and try again.",
      0,
      null,
    );
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      data?.error ||
      (res.status === 401
        ? "Your session has expired. Please log in again."
        : res.status === 403
          ? "You don't have permission to perform this action."
          : res.status === 404
            ? "The requested resource was not found."
            : res.status >= 500
              ? "Something went wrong on our end. Please try again."
              : `Request failed (${res.status})`);

    throw new ApiError(message, res.status, data);
  }

  return data;
}
