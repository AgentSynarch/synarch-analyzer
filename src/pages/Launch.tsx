import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Copy, Check, Rocket, Terminal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const agentTypes = [
  {
    id: "worker",
    name: "WORKER",
    tag: "automation",
    desc: "Scheduled jobs, web scraping, API polling, batch processing.",
    repo: "synarch-worker",
  },
  {
    id: "analyzer",
    name: "ANALYZER",
    tag: "dev-tools",
    desc: "Code review, static analysis, security scanning, report generation.",
    repo: "synarch-analyzer",
  },
  {
    id: "orchestrator",
    name: "ORCHESTRATOR",
    tag: "pipeline",
    desc: "Data pipelines, ETL flows, event routing, parallel processing.",
    repo: "synarch-orchestrator",
  },
];

type DeployState = "pick" | "deploying" | "deployed";

interface DeployResult {
  id: string;
  fork_name: string;
  agent_type: string;
  repo: string;
}

const Launch = () => {
  const [state, setState] = useState<DeployState>("pick");
  const [result, setResult] = useState<DeployResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleDeploy = async (agent: typeof agentTypes[0]) => {
    setState("deploying");
    setError("");

    try {
      const { count } = await supabase
        .from("deployed_forks")
        .select("*", { count: "exact", head: true });
      const forkName = `Synarch-Agent-${String((count ?? 0) + 1).padStart(4, "0")}`;

      const { data, error: insertError } = await supabase
        .from("deployed_forks")
        .insert({
          agent_type: agent.id,
          fork_name: forkName,
          status: "pending",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setResult({ id: data.id, fork_name: data.fork_name, agent_type: data.agent_type, repo: agent.repo });
      setState("deployed");
    } catch (err: any) {
      setError(err.message || "Deployment failed.");
      setState("pick");
    }
  };

  const installCommand = result
    ? `git clone https://github.com/AgentSynarch/${result.repo}.git && cd ${result.repo} && npm install && echo "AGENT_TOKEN=${result.id}" > .env && npm start`
    : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background grid-bg">
      <Navbar />
      <div className="pt-14">
        <div className="mx-auto max-w-4xl px-6 py-16">
          {/* Header */}
          <div className="mb-12">
            <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-3">
              // launch pad
            </p>
            <h1 className="font-mono text-4xl font-bold text-foreground mb-3">
              deploy your <span className="text-primary text-glow">agent</span>
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              {state === "deployed"
                ? "Your agent is registered. Run the command below to bring it online."
                : "Pick an agent type. One click to deploy."}
            </p>
          </div>

          {state === "deployed" && result ? (
            <div className="space-y-8">
              {/* Success */}
              <div className="border border-primary bg-primary/5 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Rocket className="w-5 h-5 text-primary" />
                  <span className="font-mono text-sm font-bold text-primary">
                    {result.fork_name}
                  </span>
                  <span className="font-mono text-[10px] border border-primary/40 text-primary px-2 py-0.5">
                    {result.agent_type}
                  </span>
                  <span className="font-mono text-[10px] border border-accent/40 text-accent-foreground px-2 py-0.5">
                    pending
                  </span>
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  Registered and waiting to connect. Paste the command below into your terminal.
                </p>
              </div>

              {/* Install command */}
              <div className="border border-border">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3 h-3 text-muted-foreground" />
                    <span className="font-mono text-[10px] text-muted-foreground">
                      paste in terminal
                    </span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                    {copied ? "copied" : "copy"}
                  </button>
                </div>
                <div className="bg-background p-5 overflow-x-auto">
                  <pre className="font-mono text-xs text-primary/90 whitespace-pre-wrap break-all leading-relaxed">
                    {installCommand}
                  </pre>
                </div>
              </div>

              {/* What happens */}
              <div className="border border-border p-6 bg-card/20">
                <h3 className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-4">
                  what happens
                </h3>
                <div className="space-y-3">
                  {[
                    "Clones the repo and installs dependencies automatically",
                    `Connects to the Synarch network using token ${result.fork_name}`,
                    "Status changes from 'pending' → 'active' in the live registry",
                    "Heartbeats, logs, and metrics tracked in real-time",
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="font-mono text-[10px] text-primary mt-0.5">0{i + 1}</span>
                      <p className="font-mono text-xs text-foreground/80">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => { setState("pick"); setResult(null); }}
                className="font-mono text-xs border border-border text-muted-foreground px-4 py-2 hover:border-foreground hover:text-foreground transition-all"
              >
                deploy another →
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {error && <p className="font-mono text-xs text-destructive">{error}</p>}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {agentTypes.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => handleDeploy(agent)}
                    disabled={state === "deploying"}
                    className="text-left p-5 border border-border bg-card/40 hover:border-primary transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-sm font-bold text-foreground">
                        {agent.name}
                      </span>
                      <span className="font-mono text-[10px] border border-primary/40 text-primary px-2 py-0.5">
                        {agent.tag}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-muted-foreground leading-relaxed mb-4">
                      {agent.desc}
                    </p>
                    <div className="flex items-center gap-2 font-mono text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <Rocket className="w-3 h-3" />
                      {state === "deploying" ? "deploying..." : "deploy →"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Launch;
