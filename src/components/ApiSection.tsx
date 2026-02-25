import React from "react";

const codeExample = `// deploy a fork from main agent
POST /v1/agents/main/fork

{
  "name": "analyzer-01",
  "type": "analyzer",
  "context": "inherit",
  "capabilities": ["read", "summarize"]
}

// response
{
  "id": "AGT-0007",
  "name": "FORK-06",
  "status": "deploying",
  "parent": "AGT-0001",
  "endpoint": "wss://core.synarch.io/agents/AGT-0007"
}`;

export const ApiSection = () => {
  return (
    <section id="api" className="py-20 border-t border-border">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Left */}
        <div>
          <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-3">
            // api
          </p>
          <h2 className="font-mono text-3xl font-bold text-foreground mb-4">
            fork in one call
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            The SYNARCH API is designed for simplicity. Deploy forks, monitor agents, and
            manage the network programmatically. Agents are first-class API citizens.
          </p>

          <div className="space-y-3">
            {[
              { method: "POST", route: "/agents/main/fork", desc: "Deploy a new fork" },
              { method: "GET", route: "/agents", desc: "List all agents" },
              { method: "DELETE", route: "/agents/:id", desc: "Kill a fork" },
              { method: "WS", route: "/agents/:id/stream", desc: "Stream agent output" },
            ].map((endpoint) => (
              <div key={endpoint.route} className="flex items-center gap-4 group">
                <span
                  className={`font-mono text-[10px] w-14 text-center py-0.5 border ${
                    endpoint.method === "POST"
                      ? "border-primary text-primary"
                      : endpoint.method === "DELETE"
                      ? "border-destructive text-destructive"
                      : endpoint.method === "WS"
                      ? "border-yellow-500/50 text-yellow-400"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {endpoint.method}
                </span>
                <span className="font-mono text-xs text-foreground flex-1">{endpoint.route}</span>
                <span className="font-mono text-xs text-muted-foreground hidden group-hover:block">
                  {endpoint.desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — terminal */}
        <div className="border border-border">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-primary/40" />
            <span className="ml-2 font-mono text-[10px] text-muted-foreground">
              terminal — api example
            </span>
          </div>
          <div className="bg-background p-5 overflow-x-auto">
            <pre className="font-mono text-xs text-foreground/80 leading-relaxed whitespace-pre">
              {codeExample.split("\n").map((line, i) => (
                <span key={i} className="block">
                  {line.startsWith("//") ? (
                    <span className="text-muted-foreground">{line}</span>
                  ) : line.includes('"status"') || line.includes('"id"') || line.includes('"name"') ? (
                    <span>
                      {line.split(":").map((part, j) =>
                        j === 0 ? (
                          <span key={j} className="text-primary/80">{part}</span>
                        ) : (
                          <span key={j}>:{part}</span>
                        )
                      )}
                    </span>
                  ) : line.startsWith("POST") || line.startsWith("{") || line.startsWith("}") ? (
                    <span className="text-foreground">{line}</span>
                  ) : (
                    line
                  )}
                </span>
              ))}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
