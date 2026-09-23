"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icons";
import { cx } from "@/lib/cx";
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

const BACK_REVEAL_MS = 240;

export function ReturnBackButton({ back }) {
  const pathname = usePathname();
  const router = useRouter();
  // Read the query without useSearchParams. That hook suspends, and the
  // fallback unmounts this button before it can slide closed.
  const search = useSyncExternalStore(
    () => () => {},
    () => window.location.search,
    () => "",
  );
  const parsed = useMemo(
    () => parseReturnTo(new URLSearchParams(search), pathname),
    [search, pathname],
  );
  // sessionStorage is client-only; read after mount. Cache with useMemo so the
  // peeked entry keeps a stable identity (useSyncExternalStore + a fresh object
  // from peekReturnStack each call caused React error #185 / max update depth
  // when navigating here via ReturnLink from the dashboard).
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const stackEntry = useMemo(
    () => (isClient ? peekReturnStack(pathname) : null),
    [isClient, pathname],
  );

  const resolved = resolveReturnBack(back, parsed, stackEntry);
  const resolvedKey = resolved
    ? `${resolved.href}|${resolved.text}|${resolved.fromStack ? "1" : "0"}`
    : "";
  const resolvedRef = useRef(resolved);
  resolvedRef.current = resolved;

  // Keep the last target mounted through the close animation so the segment
  // can slide back into the sidebar toggle instead of unmounting instantly.
  const [presented, setPresented] = useState(null);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    const next = resolvedRef.current;
    if (next) {
      setPresented(next);
      return undefined;
    }

    setOpen(false);
    const timeout = window.setTimeout(() => {
      setPresented(null);
    }, BACK_REVEAL_MS + 60);
    return () => window.clearTimeout(timeout);
  }, [resolvedKey]);

  useEffect(() => {
    if (!resolvedKey || !presented) return undefined;
    const frame = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, [resolvedKey, presented]);

  if (!presented) return null;

  return (
    <div className={cx("shell-back-slot", open && "is-open")}>
      <div className="shell-back-clip">
        <button
          type="button"
          className="shell-back-btn"
          title={presented.text}
          tabIndex={open ? 0 : -1}
          onClick={() => {
            if (presented.fromStack) {
              const fromStack = popReturnStack(pathname);
              const target = fromStack?.href || presented.href;
              if (target) router.push(target);
              return;
            }
            router.push(presented.href);
          }}
        >
          <Icon name="chevronLeft" className="h-3.5 w-3.5" />
          <span className="max-w-[9rem] truncate sm:max-w-[14rem]">{presented.text}</span>
        </button>
      </div>
    </div>
  );
}
