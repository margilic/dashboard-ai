"use client";

import React from "react";

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message || "Bilinmeyen hata" };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[dashboard-ai] error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 text-text">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-bold mb-2">Dashboard yüklenemedi</h1>
            <p className="text-sm text-text-muted mb-4">{this.state.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm px-3 py-1.5 rounded border border-border hover:bg-card-hover transition-colors"
            >
              Yenile
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}