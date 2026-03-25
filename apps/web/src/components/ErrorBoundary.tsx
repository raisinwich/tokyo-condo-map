"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("ErrorBoundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
            >
              再読み込み
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
