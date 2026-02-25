import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Fork {
  id: string;
  agent_type: string;
  fork_name: string;
  status: string;
  created_at: string;
  github_username: string | null;
}

export const ForkTracker = () => {
  const [forks, setForks] = useState<Fork[]>([]);

  useEffect(() => {
    const fetchForks = async () => {
      const { data } = await supabase
        .from("deployed_forks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setForks(data as Fork[]);
    };

    fetchForks();

    const channel = supabase
      .channel("fork-tracker")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "deployed_forks" },
        (payload) => {
          setForks((prev) => [payload.new as Fork, ...prev].slice(0, 20));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "deployed_forks" },
        (payload) => {
          setForks((prev) =>
            prev.map((f) => (f.id === (payload.new as Fork).id ? (payload.new as Fork) : f))
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const typeColor: Record<string, string> = {
    worker: "text-primary",
    analyzer: "text-accent-foreground",
    orchestrator: "text-muted-foreground",
  };

  const statusIcon: Record<string, string> = {
    active: "●",
    pending: "◌",
    idle: "◐",
    offline: "○",
  };

  return (
    <section className="py-16 border-t border-border">
      <div className="mb-8">
        <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-3">
          // network activity
        </p>
        <h2 className="font-mono text-3xl font-bold text-foreground">
          live fork tracker
        </h2>
        <p className="mt-3 text-sm text-muted-foreground max-w-lg">
          Real-time feed of agents being deployed and connecting across the network.
        </p>
      </div>

      <div className="border border-border">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card">
          <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-accent/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-primary/40" />
          <span className="ml-2 font-mono text-[10px] text-muted-foreground">
            network — live feed
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            <span className="font-mono text-[10px] text-muted-foreground">
              {forks.length} events
            </span>
          </span>
        </div>

        <div className="bg-background p-4 max-h-72 overflow-y-auto">
          {forks.length === 0 ? (
            <p className="font-mono text-xs text-muted-foreground text-center py-4">
              waiting for fork events...
            </p>
          ) : (
            <div className="space-y-1">
              {forks.map((fork) => (
                <div key={fork.id} className="font-mono text-xs flex items-center gap-2">
                  <span className="text-muted-foreground/50">
                    [{formatTime(fork.created_at)}]
                  </span>
                  <span className="text-foreground font-semibold">
                    {fork.fork_name}
                  </span>
                  <span className="text-muted-foreground">
                    {fork.status === "pending" ? "registered" : fork.status === "active" ? "connected" : fork.status} —
                  </span>
                  <span className={typeColor[fork.agent_type] || "text-foreground"}>
                    {fork.agent_type}
                  </span>
                  <span className="text-muted-foreground">
                    — {statusIcon[fork.status] || "○"} {fork.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
