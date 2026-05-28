"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/Button";

type GameEndModalProps = {
  open: boolean;
  kind: "gameOver" | "cleared" | "timeUp";
  score: number;
  canRetry: boolean;
  onRetry: () => void;
  submitting?: boolean;
  submitComplete?: boolean;
  guestMode?: boolean;
  finishedHref?: string;
  finishedLabel?: string;
  timeUpMessage?: string;
  onTryAgain?: () => void;
  tryAgainLabel?: string;
};

export function GameEndModal({
  open,
  kind,
  score,
  canRetry,
  onRetry,
  submitting = false,
  submitComplete = false,
  guestMode = false,
  finishedHref = "/dashboard",
  finishedLabel = "Browse other pools",
  timeUpMessage,
  onTryAgain,
  tryAgainLabel = "Try again",
}: GameEndModalProps) {
  const reduceMotion = useReducedMotion();
  const title =
    kind === "cleared"
      ? "Board Cleared"
      : kind === "timeUp"
        ? "Time's Up"
        : "Game Over";
  const subtitle =
    kind === "cleared"
      ? "You cleared the board. Great run."
      : kind === "timeUp"
        ? (timeUpMessage ??
          "Five minutes are up — here's how many matches you scored.")
        : "Tray full — no triple match possible.";

  const retryReady = guestMode ? true : submitComplete;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.22 }}
        >
          <motion.div
            className="absolute inset-0 bg-frx-bg/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.15 : 0.25 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-end-title"
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-frx-bg p-8 shadow-xl"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            transition={
              reduceMotion
                ? { duration: 0.18 }
                : { type: "spring", stiffness: 360, damping: 28, mass: 0.85 }
            }
          >
            <h2
              id="game-end-title"
              className="text-center text-2xl font-bold text-white"
            >
              {title}
            </h2>
            <p className="mt-2 text-center text-sm text-slate-400">{subtitle}</p>
            <motion.p
              className="mt-6 text-center text-4xl font-bold tabular-nums text-cyan-300"
              initial={reduceMotion ? false : { scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 400, damping: 22, delay: 0.06 }
              }
            >
              {score}
            </motion.p>
            <p className="mt-1 text-center text-xs text-slate-500">
              Score (matches)
            </p>
            {submitting && !guestMode ? (
              <p className="mt-4 text-center text-sm text-amber-300">
                Sign score in wallet…
              </p>
            ) : canRetry && retryReady && !guestMode ? (
              <p className="mt-4 text-center text-sm text-emerald-400/90">
                Score submitted. Ready for your next attempt.
              </p>
            ) : canRetry && guestMode ? (
              <p className="mt-4 text-center text-sm text-emerald-400/90">
                Ready for your next attempt.
              </p>
            ) : null}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              {canRetry ? (
                <Button
                  variant="primary"
                  className="w-full sm:w-auto"
                  disabled={submitting || !retryReady}
                  onClick={onRetry}
                >
                  {submitting && !guestMode ? "Submitting…" : "Retry"}
                </Button>
              ) : (
                <>
                  <Button
                    href={finishedHref}
                    variant="primary"
                    className="w-full sm:w-auto"
                  >
                    {finishedLabel}
                  </Button>
                  {guestMode && onTryAgain ? (
                    <Button
                      variant="secondary"
                      className="w-full sm:w-auto"
                      onClick={onTryAgain}
                    >
                      {tryAgainLabel}
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
