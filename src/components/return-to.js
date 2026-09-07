"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  currentOriginHref,
  originLabelFromTitle,
  parseReturnTo,
  resolveReturnBack,
  withReturnTo,
} from "@/lib/return-to";

const ReturnOriginContext = createContext({
  originHref: "",
  originLabel: "",
});

function SearchParamsSync({ onChange }) {
  const searchParams = useSearchParams();
  const serialized = searchParams.toString();

  useLayoutEffect(() => {
    onChange(serialized);
  }, [serialized, onChange]);

  return null;
}

export function ReturnToProvider({ title, children }) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const value = useMemo(
    () => ({
      originHref: currentOriginHref(pathname, new URLSearchParams(search)),
      originLabel: originLabelFromTitle(title, pathname),
    }),
    [pathname, search, title],
  );

  return (
    <ReturnOriginContext.Provider value={value}>
      <Suspense fallback={null}>
        <SearchParamsSync onChange={setSearch} />
      </Suspense>
      {children}
    </ReturnOriginContext.Provider>
  );
}

export function ReturnLink({ href, fromLabel, ...props }) {
  const { originHref, originLabel } = useContext(ReturnOriginContext);
  const nextHref = withReturnTo(href, {
    from: originHref,
    fromLabel: fromLabel ?? originLabel,
  });

  return <Link href={nextHref} {...props} />;
}

export function useReturnTo() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return parseReturnTo(searchParams, pathname);
}

export function useReturnPush() {
  const router = useRouter();
  const { originHref, originLabel } = useContext(ReturnOriginContext);

  return useCallback(
    (href, fromLabel) => {
      router.push(
        withReturnTo(href, {
          from: originHref,
          fromLabel: fromLabel ?? originLabel,
        }),
      );
    },
    [router, originHref, originLabel],
  );
}

export function ReturnBackButton({ back }) {
  const parsed = useReturnTo();
  const resolved = resolveReturnBack(back, parsed);

  if (!resolved) return null;

  return (
    <Link
      href={resolved.href}
      className="btn shrink-0 px-3 py-2 text-xs"
      title={resolved.text}
    >
      <span className="max-w-[10rem] truncate sm:max-w-[16rem]">{resolved.text}</span>
    </Link>
  );
}
