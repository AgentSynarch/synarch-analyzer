import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AgentDetailDialog } from "@/components/AgentDetailDialog";

interface Agent {
  dbId: string;
  id: string;
  name: string;
  status: "active" | "idle" | "deploying";
  type: string;
  github_username: string | null;
  created_at: string;
  isMain?: boolean;
}

const mainAgent: Agent = {
  dbId: "main",
  id: "AGT-0001",
  name: "MAIN",
  status: "active",
  type: "orchestrator",
  github_username: null,
  created_at: "",
  isMain: true,
};

const statusColor: Record<Agent["status"], string> = {
  active: "text-primary",
  idle: "text-muted-foreground",
  deploying: "text-yellow-400",
};

const statusDot: Record<Agent["status"], string> = {
  active: "bg-primary",
  idle: "bg-muted-foreground",
  deploying: "bg-yellow-400",
};

export const AgentTable = () => {
  const [agents, setAgents] = useState<Agent[]>([mainAgent]);
  const [selectedForkId, setSelectedForkId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetchAgents = async () => {
      const { data } = await supabase
        .from("deployed_forks")
        .select("*")
        .order("created_at", { ascending: true });
      if (data) {
        const mapped: Agent[] = data.map((f: any) => ({
          dbId: f.id,
          id: f.id.slice(0, 8).toUpperCase(),
          name: f.agent_name || f.fork_name,
          status: f.status === "idle" ? "idle" : "active",
          type: f.agent_type,
          github_username: f.github_username,
          created_at: f.created_at,
        }));
        setAgents([mainAgent, ...mapped]);
      }
    };

    fetchAgents();

    const channel = supabase
      .channel("agent-table")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "deployed_forks" },
        (payload) => {
          const f = payload.new as any;
          setAgents((prev) => [
            ...prev,
            {
              dbId: f.id,
              id: f.id.slice(0, 8).toUpperCase(),
              name: f.agent_name || f.fork_name,
              status: "active",
              type: f.agent_type,
              github_username: f.github_username,
              created_at: f.created_at,
            },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRowClick = (agent: Agent) => {
    if (agent.isMain) return;
    setSelectedForkId(agent.dbId);
    setDialogOpen(true);
  };

  return (
    <>
      <section id="agents" className="border border-border">
        {/* Table header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted-foreground tracking-widest uppercase">
              agent registry
            </span>
            <span className="font-mono text-xs border border-border px-2 py-0.5 text-muted-foreground">
              {agents.length} agents
            </span>
          </div>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-4 px-5 py-2 border-b border-border">
          {["id", "name", "status", "type"].map((col) => (
            <span key={col} className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
              {col}
            </span>
          ))}
        </div>

        {/* Rows */}
        <div className="divide-y divide-border max-h-96 overflow-y-auto">
          {agents.map((agent, i) => (
            <div
              key={`${agent.id}-${i}`}
              onClick={() => handleRowClick(agent)}
              className={`grid grid-cols-4 px-5 py-3 transition-colors hover:bg-muted/30 cursor-pointer ${
                agent.isMain ? "bg-primary/5" : ""
              }`}
            >
              <span className="font-mono text-xs text-muted-foreground">{agent.id}</span>
              <span
                className={`font-mono text-xs font-semibold ${
                  agent.isMain ? "text-primary text-glow" : "text-foreground"
                }`}
              >
                {agent.name}
                {agent.isMain && (
                  <span className="ml-2 text-[9px] border border-primary/50 px-1 py-0.5 text-primary/70">
                    root
                  </span>
                )}
              </span>
              <span className={`font-mono text-xs flex items-center gap-1.5 ${statusColor[agent.status]}`}>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${statusDot[agent.status]} ${
                    agent.status === "active" ? "animate-pulse" : ""
                  }`}
                />
                {agent.status}
              </span>
              <span className="font-mono text-xs text-muted-foreground">{agent.type}</span>
            </div>
          ))}
        </div>
      </section>

      <AgentDetailDialog
        forkId={selectedForkId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
};
