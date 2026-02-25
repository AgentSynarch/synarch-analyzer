import React from "react";
import { Navbar } from "@/components/Navbar";
import { Link } from "react-router-dom";

const forkTypes = [
  {
    id: "worker",
    name: "WORKER",
    tag: "automation",
    color: "text-primary border-primary/50",
    repo: "github.com/AgentSynarch/synarch-worker",
    summary: "Automates parallel workloads on autopilot.",
    description:
      "Worker agents handle the heavy lifting of your infrastructure. They're designed for tasks that need to run continuously or on a schedule without human intervention. Deploy a Worker when you need reliable, always-on automation.",
    useCases: [
      "Scheduled cron jobs & recurring tasks",
      "Web scraping & content monitoring",
      "API polling & webhook processing",
      "Batch file operations & data transforms",
      "Queue processing & background jobs",
    ],
    config: {
      log_level: "info | debug | warn | error",
      max_retries: "0–10 (default: 3)",
      auto_restart: "true | false (default: true)",
    },
    techStack: ["Node.js runtime", "Built-in retry logic", "Isolated context per fork", "Auto-healing on crash"],
  },
  {
    id: "analyzer",
    name: "ANALYZER",
    tag: "dev-tools",
    color: "text-blue-400 border-blue-400/50",
    repo: "github.com/AgentSynarch/synarch-analyzer",
    summary: "Code review, static analysis, and CI/CD integration.",
    description:
      "Analyzer agents integrate directly into your development workflow. They hook into your repositories to provide automated code review, catch bugs before they ship, generate tests, and enforce quality standards across your codebase.",
    useCases: [
      "Automated code review on PRs",
      "Static analysis & linting",
      "Test generation & coverage tracking",
      "Dependency vulnerability scanning",
      "CI/CD pipeline quality gates",
    ],
    config: {
      log_level: "info | debug | warn | error",
      max_retries: "0–10 (default: 3)",
      auto_restart: "true | false (default: true)",
    },
    techStack: ["GitHub/GitLab integration", "AST-based code parsing", "Multi-language support", "Incremental analysis"],
  },
  {
    id: "orchestrator",
    name: "ORCHESTRATOR",
    tag: "pipeline",
    color: "text-purple-400 border-purple-400/50",
    repo: "github.com/AgentSynarch/synarch-orchestrator",
    summary: "Routes, transforms, and syncs data across sources.",
    description:
      "Orchestrator agents are the backbone of your data infrastructure. They manage complex ETL flows, event streams, and multi-step data processing pipelines. Deploy an Orchestrator when you need to move and transform data reliably between systems.",
    useCases: [
      "ETL pipelines & data warehousing",
      "Real-time event stream processing",
      "Multi-source data synchronization",
      "API gateway & request routing",
      "Workflow automation & state machines",
    ],
    config: {
      log_level: "info | debug | warn | error",
      max_retries: "0–10 (default: 3)",
      auto_restart: "true | false (default: true)",
    },
    techStack: ["Event-driven architecture", "Built-in data transforms", "Dead letter queues", "Schema validation"],
  },
];

const Forks = () => {
  return (
    <div className="min-h-screen bg-background grid-bg">
      <Navbar />
      <div className="pt-14">
        <div className="mx-auto max-w-6xl px-6 py-16">
          {/* Header */}
          <div className="mb-16">
            <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-3">// fork types</p>
            <h1 className="font-mono text-4xl font-bold text-foreground mb-3">
              agent <span className="text-primary text-glow">blueprints</span>
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              SYNARCH supports three specialized agent types. Each is purpose-built for a specific class of workloads. Choose the right blueprint, configure it, and deploy.
            </p>
          </div>

          {/* Fork type deep dives */}
          <div className="space-y-16">
            {forkTypes.map((ft, idx) => (
              <div key={ft.id} className="border border-border">
                {/* Header bar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/40">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-lg font-bold text-foreground">{ft.name}</span>
                    <span className={`font-mono text-[10px] border px-2 py-0.5 ${ft.color}`}>{ft.tag}</span>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground/50">{ft.repo}</span>
                </div>

                <div className="p-6">
                  <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-2xl">{ft.description}</p>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Use cases */}
                    <div className="border border-border p-5 bg-card/20">
                      <h4 className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-4">use cases</h4>
                      <ul className="space-y-2">
                        {ft.useCases.map((uc) => (
                          <li key={uc} className="text-xs text-foreground/80 flex items-start gap-2">
                            <span className="text-primary mt-0.5">›</span>
                            {uc}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Config */}
                    <div className="border border-border p-5 bg-card/20">
                      <h4 className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-4">configuration</h4>
                      <div className="space-y-3">
                        {Object.entries(ft.config).map(([key, val]) => (
                          <div key={key}>
                            <span className="font-mono text-[10px] text-primary block">{key}</span>
                            <span className="font-mono text-[10px] text-muted-foreground">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tech */}
                    <div className="border border-border p-5 bg-card/20">
                      <h4 className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-4">tech stack</h4>
                      <ul className="space-y-2">
                        {ft.techStack.map((ts) => (
                          <li key={ts} className="font-mono text-xs text-foreground/80 flex items-center gap-2">
                            <span className="w-1 h-1 bg-primary rounded-full" />
                            {ts}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-border bg-card/20 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground">ready to deploy</span>
                  <Link
                    to="/launch"
                    className="font-mono text-[10px] border border-primary text-primary px-4 py-1.5 hover:bg-primary hover:text-primary-foreground transition-all"
                  >
                    launch {ft.id} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Forks;
