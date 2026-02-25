import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { AgentDetailDialog } from "@/components/AgentDetailDialog";

interface Agent {
  id: string;
  fork_name: string;
  agent_name: string | null;
  agent_type: string;
  status: string;
  github_username: string | null;
  description: string | null;
  created_at: string;
  log_level: string;
  max_retries: number;
  auto_restart: boolean;
}

const typeAccent: Record<string, string> = {
  worker: "border-primary/60 text-primary",
  analyzer: "border-blue-400/60 text-blue-400",
  orchestrator: "border-purple-400/60 text-purple-400",
};

const Agents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("deployed_forks")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setAgents(data as Agent[]);
    };
    fetch();

    const channel = supabase
      .channel("agents-page")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "deployed_forks" }, (payload) => {
        setAgents((prev) => [payload.new as Agent, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="min-h-screen bg-background grid-bg">
      <Navbar />
      <div className="pt-14">
        <div className="mx-auto max-w-6xl px-6 py-16">
          {/* Header */}
          <div className="mb-12">
            <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-3">
              // agent registry
            </p>
            <h1 className="font-mono text-4xl font-bold text-foreground mb-3">
              deployed <span className="text-primary text-glow">agents</span>
            </h1>
            <p className="text-sm text-muted-foreground max-w-lg">
              All forked agents currently deployed across the network. Click any agent to view its full configuration and deployer profile.
            </p>
            <div className="mt-4 flex items-center gap-4">
              <span className="font-mono text-xs border border-border px-3 py-1 text-muted-foreground">
                {agents.length} total agents
              </span>
              <span className="font-mono text-xs border border-primary/40 px-3 py-1 text-primary">
                {agents.filter((a) => a.status === "active").length} active
              </span>
            </div>
          </div>

          {/* Agent grid */}
          {agents.length === 0 ? (
            <div className="border border-border p-16 text-center">
              <p className="font-mono text-sm text-muted-foreground">no agents deployed yet</p>
              <p className="font-mono text-xs text-muted-foreground/60 mt-2">
                deploy your first agent from the <a href="/launch" className="text-primary hover:underline">launch page</a>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => { setSelectedId(agent.id); setDialogOpen(true); }}
                  className="bg-background p-6 text-left hover:bg-card/60 transition-all group"
                >
                  {/* Top row */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`font-mono text-[10px] border px-2 py-0.5 ${typeAccent[agent.agent_type] || "border-border text-muted-foreground"}`}>
                      {agent.agent_type}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${agent.status === "active" ? "bg-primary animate-pulse" : "bg-muted-foreground"}`} />
                      <span className="font-mono text-[10px] text-muted-foreground">{agent.status}</span>
                    </span>
                  </div>

                  {/* Name */}
                  <h3 className="font-mono text-sm font-bold text-foreground group-hover:text-primary transition-colors mb-1">
                    {agent.agent_name || agent.fork_name}
                  </h3>
                  <p className="font-mono text-[10px] text-muted-foreground/60 mb-3">{agent.fork_name}</p>

                  {/* Description */}
                  {agent.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">
                      {agent.description}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {agent.github_username ? `@${agent.github_username}` : "anonymous"}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground/50">
                      {formatDate(agent.created_at)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <AgentDetailDialog forkId={selectedId} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
};

export default Agents;
