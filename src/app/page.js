import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function Home() {
  const base = process.env.API_INTERNAL_BASE_URL || "http://localhost:4000";

  const cookieStore = await cookies();

  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  let sessionOk = false;

  try {
    const res = await fetch(`${base}/dashboard`, {
      headers: {
        cookie: cookieHeader,
      },
      cache: "no-store",
    });
    sessionOk = res.ok;
  } catch (err) {
    console.error("Home auth check failed:", err?.cause?.code || err?.message || err);
  }

  if (sessionOk) redirect("/dashboard");
  redirect("/login");
}
