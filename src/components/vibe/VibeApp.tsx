"use client";

import { useRef, useState, type FormEvent } from "react";

import { DEFAULT_DAYS } from "@/lib/constants";
import type { VibeRequest, VibeSummary, WindowDays } from "@/lib/types";
import { runVibeCheck } from "@/lib/vibe-client";

import { ErrorPanel } from "./ErrorPanel";
import { ReadyPanel } from "./ReadyPanel";
import { ResultSkeleton } from "./ResultSkeleton";
import { VibeForm } from "./VibeForm";
import { VibeResult } from "./VibeResult";

type ViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; summary: VibeSummary };

/**
 * The interactive island for the whole app. State lives here; everything it
 * renders is presentational, so this is the only file that needs the client
 * directive.
 */
export function VibeApp() {
  const [topic, setTopic] = useState("");
  const [days, setDays] = useState<WindowDays>(DEFAULT_DAYS);
  const [state, setState] = useState<ViewState>({ status: "idle" });

  // Controls are disabled while a check runs, but a fast repeat submit can
  // still slip through. Only the newest check is allowed to set state.
  const latestCheck = useRef(0);
  const loading = state.status === "loading";

  async function runCheck(request: VibeRequest) {
    const check = ++latestCheck.current;
    setState({ status: "loading" });

    try {
      const summary = await runVibeCheck(request);
      if (check !== latestCheck.current) return;
      setTopic(summary.topic);
      setState({ status: "ready", summary });
    } catch (error) {
      if (check !== latestCheck.current) return;
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runCheck({ topic, days });
  }

  function handlePreset(preset: string) {
    setTopic(preset);
    void runCheck({ topic: preset, days });
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <VibeForm
        topic={topic}
        days={days}
        loading={loading}
        onTopicChange={setTopic}
        onDaysChange={setDays}
        onSubmit={handleSubmit}
        onPreset={handlePreset}
      />

      <section aria-live="polite" aria-busy={loading} className="mt-5">
        {state.status === "idle" && <ReadyPanel />}
        {state.status === "loading" && <ResultSkeleton topic={topic} />}
        {state.status === "error" && <ErrorPanel message={state.message} />}
        {state.status === "ready" && <VibeResult summary={state.summary} />}
      </section>
    </div>
  );
}
