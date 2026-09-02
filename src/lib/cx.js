export function cx(...classes) {
  return classes.flat(Infinity).filter(Boolean).join(" ");
}
