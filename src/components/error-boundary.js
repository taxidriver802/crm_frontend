"use client";

import { Component } from "react";
import { StatusPage } from "@/components/brand/status-page";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      // This boundary sits around the whole shell, so when it catches, no
      // company is on screen any more: the page falls back to Joist.
      return (
        <StatusPage
          inShell={false}
          title="Something went wrong"
          description={this.state.error?.message || "An unexpected error occurred."}
        >
          <button
            type="button"
            className="btn px-4 py-2 text-sm"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </StatusPage>
      );
    }
    return this.props.children;
  }
}

export function PageError({ message, onRetry }) {
  return (
    <div className="card p-4">
      <div className="text-sm font-medium text-danger">Something went wrong</div>
      <div className="mt-1 text-sm text-muted">
        {message || "An unexpected error occurred."}
      </div>
      {onRetry ? (
        <button type="button" className="btn mt-3 px-3 py-2 text-xs" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      {icon ? <div className="mb-2 flex justify-center text-muted">{icon}</div> : null}
      <div className="text-sm font-medium text-main">{title || "Nothing here yet"}</div>
      {description ? <div className="mt-1 text-xs">{description}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
