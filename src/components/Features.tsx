import React from "react";

const features = [
  {
    title: "task automation",
    desc: "Worker agents handle scheduled jobs, web scraping, API polling, and batch processing — all running on autopilot.",
    tag: "worker",
  },
  {
    title: "code analysis",
    desc: "Analyzer agents plug into your repos for code review, static analysis, test generation, and CI/CD quality gates.",
    tag: "analyzer",
  },
  {
    title: "data pipelines",
    desc: "Orchestrator agents route, transform, and sync data across sources — ETL flows, event streams, and more.",
    tag: "orchestrator",
  },
  {
    title: "fork & deploy",
    desc: "Fork any agent type from GitHub, configure your environment, and deploy in under a minute.",
    tag: "core",
  },
  {
    title: "live tracking",
    desc: "Every forked agent is tracked in real-time. See global deployments, statuses, and types at a glance.",
    tag: "ops",
  },
  {
    title: "context isolation",
    desc: "Each fork runs in isolated context on your own infra. Failures are contained, forks can be killed independently.",
    tag: "safety",
  },
];

export const Features = () => {
  return (
    <section id="forks" className="py-20">
      <div className="mb-12">
        <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-3">
          // capabilities
        </p>
        <h2 className="font-mono text-3xl font-bold text-foreground">
          built for agent networks
        </h2>
        <p className="mt-3 text-sm text-muted-foreground max-w-lg">
          Everything you need to build hierarchical AI systems. One main agent. Infinite forks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="bg-background p-6 border border-border hover:bg-card transition-colors group"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-mono text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <span className="font-mono text-[9px] border border-border px-2 py-0.5 text-muted-foreground tracking-widest">
                {feature.tag}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
