import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function Home() {
  const base = process.env.API_INTERNAL_BASE_URL || "http://localhost:4000";

  const cookieStore = await cookies();

  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const res = await fetch(`${base}/dashboard`, {
    headers: {
      cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (res.ok) redirect("/dashboard");
  redirect("/login");
}
