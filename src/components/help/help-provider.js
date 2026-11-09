"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { HELP_CONTENTS, HELP_EVENT, readHelpParam, writeHelpParam } from "@/lib/help";

/**
 * Help: the user guide, one article at a time, in a panel over whatever the
 * person is doing. Like peek, the open article is in the URL; opening it
 * never navigates. The article list comes from the server already filtered
 * by role, so an agent cannot reach an owner's article by search or link.
 */

const HelpContext = createContext({
  helpId: null,
  articles: [],
  loaded: false,
  openHelp: () => {},
  closeHelp: () => {},
  hasArticle: () => false,
});

function subscribe(callback) {
  window.addEventListener("popstate", callback);
  window.addEventListener(HELP_EVENT, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(HELP_EVENT, callback);
  };
}

export function HelpProvider({ children }) {
  // A new page's URL is read on navigation.
  usePathname();
  const helpId = useSyncExternalStore(subscribe, readHelpParam, () => null);
  const [articles, setArticles] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    api("/help")
      .then((res) => {
        if (!alive) return;
        setArticles(res?.articles || []);
        setLoaded(true);
      })
      .catch(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  const openHelp = useCallback((id) => writeHelpParam(id || HELP_CONTENTS), []);
  const closeHelp = useCallback(() => writeHelpParam(null), []);
  const hasArticle = useCallback((id) => articles.some((a) => a.id === id), [articles]);

  const value = useMemo(
    () => ({ helpId, articles, loaded, openHelp, closeHelp, hasArticle }),
    [helpId, articles, loaded, openHelp, closeHelp, hasArticle],
  );
  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
}

export function useHelp() {
  return useContext(HelpContext);
}

/**
 * The one link at a moment that matters: "How?" beside a next step. It
 * renders nothing when the person's role has no such article.
 */
export function HelpLink({ article, children = "How?", className = "help-link" }) {
  const { openHelp, hasArticle } = useHelp();
  if (!article || !hasArticle(article)) return null;
  return (
    <button
      type="button"
      className={className}
      data-testid="help-link"
      data-article={article}
      onClick={(event) => {
        event.stopPropagation();
        openHelp(article);
      }}
    >
      {children}
    </button>
  );
}
