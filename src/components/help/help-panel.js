"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { HELP_CONTENTS, START_HERE, matchHelp } from "@/lib/help";
import { useMediaQuery } from "@/lib/use-media-query";
import { Icon } from "@/components/icons";
import { Eyebrow } from "@/components/records/record-bits";
import { usePeek } from "@/components/peek/peek-provider";
import { useHelp } from "./help-provider";

/* ------------------------------------------------------------------ */
/* Inline markdown: **bold**, `code`, [label](/path or #article)       */
/* ------------------------------------------------------------------ */

const INLINE_SOURCE = /\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/.source;

function Inline({ text, onArticle }) {
  const parts = [];
  let last = 0;
  let match;
  const inlineRe = new RegExp(INLINE_SOURCE, "g");
  while ((match = inlineRe.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const key = `${match.index}`;
    if (match[1] !== undefined) {
      parts.push(<strong key={key}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      parts.push(
        <code key={key} className="help-code">
          {match[2]}
        </code>,
      );
    } else {
      const href = match[4];
      const label = match[3];
      if (href.startsWith("#")) {
        parts.push(
          <button key={key} type="button" className="link" onClick={() => onArticle(href.slice(1))}>
            {label}
          </button>,
        );
      } else if (href.startsWith("/")) {
        parts.push(
          <Link key={key} href={href} className="link">
            {label}
          </Link>,
        );
      } else {
        parts.push(label);
      }
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function Blocks({ blocks, onArticle }) {
  return (
    <div className="help-article">
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h3 key={i} className="help-h3">
              <Inline text={block.text} onArticle={onArticle} />
            </h3>
          );
        }
        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List key={i} className={block.ordered ? "help-ol" : "help-ul"}>
              {block.items.map((item, j) => (
                <li key={j}>
                  <Inline text={item} onArticle={onArticle} />
                </li>
              ))}
            </List>
          );
        }
        return (
          <p key={i}>
            <Inline text={block.text} onArticle={onArticle} />
          </p>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Contents({ articles, onArticle }) {
  const [query, setQuery] = useState("");
  const start = articles.find((a) => a.id === START_HERE);
  const about = articles.find((a) => a.kind === "about");
  const tasks = articles.filter((a) => a.kind === "task" || a.kind === "reference");
  const shown = query.trim() ? matchHelp(tasks, query) : tasks;

  const groups = [];
  for (const article of shown) {
    const name = article.group || "More";
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.items.push(article);
    else groups.push({ name, items: [article] });
  }

  return (
    <>
      {start || about ? (
        <div className="help-start">
          {start ? (
            <button type="button" className="help-card help-card-strong" onClick={() => onArticle(start.id)}>
              <span className="eyebrow">Start here</span>
              <span className="font-medium">Your first job, from the first call to paid and closed</span>
            </button>
          ) : null}
          {about ? (
            <button type="button" className="help-card" onClick={() => onArticle(about.id)}>
              <span className="eyebrow">The basics</span>
              <span className="font-medium">{about.title}</span>
            </button>
          ) : null}
        </div>
      ) : null}

      <label className="block">
        <span className="sr-only">Find a task</span>
        <input
          type="search"
          className="input"
          placeholder="What do you want to do?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Find a help article"
        />
      </label>

      {groups.length === 0 ? (
        <p className="text-sm text-muted">No article matches. Try fewer words.</p>
      ) : (
        <nav aria-label="Help articles" className="flex flex-col gap-4">
          {groups.map((group) => (
            <section key={group.name}>
              <Eyebrow className="mb-1.5">{group.name}</Eyebrow>
              <ul className="help-list">
                {group.items.map((article) => (
                  <li key={article.id}>
                    <button type="button" className="help-row" onClick={() => onArticle(article.id)}>
                      <span>{article.title}</span>
                      <Icon name="chevronRight" className="h-3.5 w-3.5 text-muted" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

function screenPath(href) {
  return String(href || "").split("?")[0];
}

export function HelpPanel() {
  const { helpId, articles, loaded, openHelp, closeHelp } = useHelp();
  const { peek } = usePeek();
  const pathname = usePathname();
  const wide = useMediaQuery("(min-width: 1024px)");
  const [state, setState] = useState({ id: null, article: null, error: null });
  const panelRef = useRef(null);

  const isContents = helpId === HELP_CONTENTS;
  const articleId = helpId && !isContents ? helpId : null;

  useEffect(() => {
    if (!articleId) return undefined;
    let alive = true;
    api(`/help/${articleId}`)
      .then((res) => alive && setState({ id: articleId, article: res.article, error: null }))
      .catch((e) => alive && setState({ id: articleId, article: null, error: e }));
    return () => {
      alive = false;
    };
  }, [articleId]);

  // Escape closes Help first; the preview under it stays open.
  useEffect(() => {
    if (!helpId) return undefined;
    function onKey(event) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      closeHelp();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [helpId, closeHelp]);

  useEffect(() => {
    if (helpId) requestAnimationFrame(() => panelRef.current?.focus());
  }, [helpId]);

  const onArticle = useCallback(
    (id) => openHelp(articles.some((a) => a.id === id) ? id : HELP_CONTENTS),
    [articles, openHelp],
  );

  const article = state.id === articleId ? state.article : null;
  const error = state.id === articleId ? state.error : null;
  const loading = Boolean(articleId) && !article && !error;

  // Going to the screen is the one moment Help navigates. On a wide screen
  // the article comes along, beside the work; on a phone it gets out of the way.
  const screen = article?.screen;
  const onScreen = screen && screenPath(screen.href) === pathname;
  const screenHref = useMemo(() => {
    if (!screen) return null;
    if (!wide) return screen.href;
    const url = new URL(screen.href, "http://x");
    url.searchParams.set("help", article.id);
    return `${url.pathname}${url.search}`;
  }, [screen, wide, article]);

  if (!helpId) return null;

  const title = isContents ? "Help" : loading ? "Loading…" : error ? "Help" : article?.title;
  const eyebrow = isContents
    ? "User guide"
    : article?.kind === "start"
      ? "Start here"
      : article?.kind === "about"
        ? "The basics"
        : article?.group || "Help";

  return (
    <aside
      ref={panelRef}
      tabIndex={-1}
      className={cx("peek-panel help-panel", peek && "help-beside-peek")}
      role="dialog"
      aria-modal="false"
      aria-label="Help"
      data-testid="help-panel"
      data-article={articleId || HELP_CONTENTS}
    >
      <header className="peek-head">
        <div className="min-w-0">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="peek-title">{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!isContents ? (
            <button
              type="button"
              className="icon-btn icon-btn-quiet"
              aria-label="All help"
              title="All help"
              onClick={() => openHelp(HELP_CONTENTS)}
            >
              <Icon name="list" className="h-4 w-4" />
            </button>
          ) : null}
          <button type="button" className="icon-btn icon-btn-quiet" aria-label="Close help" onClick={closeHelp}>
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
      </header>
      <div className="peek-body">
        {isContents ? (
          loaded ? (
            <Contents articles={articles} onArticle={onArticle} />
          ) : (
            <div className="skeleton h-24 w-full" />
          )
        ) : error ? (
          <div className="flex flex-col gap-3 text-sm">
            <p>
              {error?.status === 404
                ? "There is no help article by that name for your role."
                : "Help could not be loaded. Check your connection and try again."}
            </p>
            <button type="button" className="btn btn-sm self-start" onClick={() => openHelp(HELP_CONTENTS)}>
              See all help
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-24 w-full" />
          </div>
        ) : (
          <>
            {screen ? (
              <div className="help-screen">
                {onScreen ? (
                  <span className="text-sm text-muted">You are on {screen.label}.</span>
                ) : (
                  <Link href={screenHref} className="btn btn-primary btn-sm" data-testid="help-go">
                    Go to {screen.label}
                    <Icon name="arrowUpRight" className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            ) : null}
            <Blocks blocks={article.blocks} onArticle={onArticle} />
          </>
        )}
      </div>
    </aside>
  );
}

