"use client";

import { useState, useEffect, useCallback } from "react";

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);

  const refetch = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchApi<T>(path);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, error, loading, refetch };
}
