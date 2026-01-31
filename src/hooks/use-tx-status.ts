"use client";

import { useState, useEffect, useRef } from "react";

type TxStatus = "idle" | "pending" | "success" | "failed";

export function useTxStatus(txId: string | null, pollIntervalMs = 15000) {
  const [status, setStatus] = useState<TxStatus>(txId ? "pending" : "idle");
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!txId) {
      setStatus("idle");
      return;
    }

    setStatus("pending");

    const checkStatus = async () => {
      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_STACKS_API_URL ||
          "https://api.testnet.hiro.so";
        const res = await fetch(`${apiUrl}/extended/v1/tx/${txId}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.tx_status === "success") {
          setStatus("success");
          if (intervalRef.current) clearInterval(intervalRef.current);
        } else if (
          data.tx_status !== "pending" &&
          data.tx_status !== "submitted"
        ) {
          setStatus("failed");
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch {
        // Network error, keep polling
      }
    };

    checkStatus();
    intervalRef.current = setInterval(checkStatus, pollIntervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [txId, pollIntervalMs]);

  return status;
}
