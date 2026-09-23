/** Customer routes stay on light scheme; company palette still applies. */
export function isPublicCustomerPath(pathname) {
  return typeof pathname === "string" && pathname.startsWith("/public/");
}

export function isAuthEntryPath(pathname) {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/accept-invite"
  );
}
