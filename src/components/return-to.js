"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  currentOriginHref,
  originLabelFromTitle,
  parseReturnTo,
  peekReturnStack,
  popReturnStack,
  pushReturnStack,
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

export function ReturnLink({ href, fromLabel, onClick, ...props }) {
  const { originHref, originLabel } = useContext(ReturnOriginContext);
  const label = fromLabel ?? originLabel;
  const nextHref = withReturnTo(href, {
    from: originHref,
    fromLabel: label,
  });

  return (
    <Link
      {...props}
      href={nextHref}
      onClick={(event) => {
        if (originHref) {
          pushReturnStack({ href: originHref, label });
        }
        onClick?.(event);
      }}
    />
  );
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
      const label = fromLabel ?? originLabel;
      if (originHref) {
        pushReturnStack({ href: originHref, label });
      }
      router.push(
        withReturnTo(href, {
          from: originHref,
          fromLabel: label,
        }),
      );
    },
    [router, originHref, originLabel],
  );
}

export function ReturnBackButton({ back }) {
  const pathname = usePathname();
  const router = useRouter();
  const parsed = useReturnTo();
  const [stackEntry, setStackEntry] = useState(null);

  useLayoutEffect(() => {
    setStackEntry(peekReturnStack(pathname));
  }, [pathname, parsed?.href]);

  const resolved = resolveReturnBack(back, parsed, stackEntry);

  if (!resolved) return null;

  return (
    <button
      type="button"
      className="btn shrink-0 px-3 py-2 text-xs"
      title={resolved.text}
      onClick={() => {
        if (resolved.fromStack) {
          const fromStack = popReturnStack(pathname);
          const target = fromStack?.href || resolved.href;
          if (target) router.push(target);
          return;
        }
        router.push(resolved.href);
      }}
    >
      <span className="max-w-[10rem] truncate sm:max-w-[16rem]">{resolved.text}</span>
    </button>
  );
}
