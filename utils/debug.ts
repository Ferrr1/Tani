import { useState } from "react";

const DEBUG = false;
export function useDebug() {
  const [lines, setLines] = useState<string[]>([]);
  const push = (...args: any[]) => {
    const msg = args
      .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
      .join(" ");
    if (__DEV__ || DEBUG) console.log("[Reset]", msg);
    setLines((prev) => [...prev.slice(-15), msg]);
  };
  return { lines, push };
}
