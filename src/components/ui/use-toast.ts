"use client";

import * as React from "react";
import type { ToastProps } from "./toast";

const TOAST_LIMIT = 4;
const TOAST_REMOVE_DELAY = 5000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
};

type Toast = Omit<ToasterToast, "id">;

let count = 0;
function genId(): string {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return String(count);
}

type State = { toasts: ToasterToast[] };

const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };
const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

function setState(next: State) {
  memoryState = next;
  listeners.forEach((listener) => listener(memoryState));
}

function scheduleRemoval(id: string) {
  if (timeouts.has(id)) return;
  const timeout = setTimeout(() => {
    timeouts.delete(id);
    setState({ toasts: memoryState.toasts.filter((t) => t.id !== id) });
  }, TOAST_REMOVE_DELAY);
  timeouts.set(id, timeout);
}

function dismiss(id: string) {
  setState({
    toasts: memoryState.toasts.map((t) => (t.id === id ? { ...t, open: false } : t)),
  });
  scheduleRemoval(id);
}

function toast(props: Toast) {
  const id = genId();
  const next: ToasterToast = {
    ...props,
    id,
    open: true,
    onOpenChange: (open) => {
      if (!open) dismiss(id);
    },
  };
  setState({ toasts: [next, ...memoryState.toasts].slice(0, TOAST_LIMIT) });
  return { id, dismiss: () => dismiss(id) };
}

function useToast() {
  const [state, setLocalState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setLocalState);
    return () => {
      const index = listeners.indexOf(setLocalState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  return { ...state, toast, dismiss };
}

export { useToast, toast };
export type { ToasterToast };
