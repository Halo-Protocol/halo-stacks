"use client";

import { useEffect, useState } from "react";

interface Activity {
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export function ActivityFeed({ circleId }: { circleId: string }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchActivity() {
      try {
        const res = await fetch(`/api/circles-v2/${circleId}/activity`);
        if (res.ok && active) {
          const data = await res.json();
          setActivities(data.activities || []);
        }
      } catch {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchActivity();
    const interval = setInterval(fetchActivity, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [circleId]);

  if (loading) {
    return <div className="text-gray-400 text-sm">Loading activity...</div>;
  }

  if (activities.length === 0) {
    return <div className="text-gray-500 text-sm">No activity yet.</div>;
  }

  return (
    <div className="space-y-3">
      {activities.map((a, i) => (
        <div
          key={`${a.type}-${a.timestamp}-${i}`}
          className="flex items-start gap-3 text-sm"
        >
          <div className="mt-1">
            {a.type === "contribution" && (
              <div className="w-2 h-2 rounded-full bg-green-500" />
            )}
            {a.type === "bid" && (
              <div className="w-2 h-2 rounded-full bg-blue-500" />
            )}
            {a.type === "settlement" && (
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-gray-200">{formatActivity(a)}</p>
            <p className="text-gray-500 text-xs">
              {new Date(a.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatActivity(a: Activity): string {
  switch (a.type) {
    case "contribution":
      return `${a.data.userName} contributed for Round ${a.data.round}`;
    case "bid":
      return `${a.data.userName} placed a bid for Round ${a.data.round}`;
    case "settlement":
      return `Round ${a.data.round} settled — ${a.data.winnerName} won`;
    default:
      return `${a.type} event`;
  }
}
