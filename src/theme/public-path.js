/** Customer routes stay on the default palette and light scheme. */
export function isPublicCustomerPath(pathname) {
  return typeof pathname === "string" && pathname.startsWith("/public/");
}
