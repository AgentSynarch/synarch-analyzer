import React from "react";
import { Navbar } from "@/components/Navbar";
import { ExternalLink } from "lucide-react";

const Twitter = () => {
  return (
    <div className="min-h-screen bg-background grid-bg">
      <Navbar />
      <div className="pt-14">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-12">
            <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-3">// social</p>
            <h1 className="font-mono text-4xl font-bold text-foreground mb-3">
              follow on <span className="text-primary text-glow">X</span>
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Stay updated with the latest SYNARCH developments, new agent types, network stats, and community highlights.
            </p>
          </div>

          <div className="border border-border">
            <div className="p-8 bg-card/40 text-center">
              <div className="w-16 h-16 border border-primary mx-auto mb-6 flex items-center justify-center">
                <span className="font-mono text-2xl font-bold text-primary">𝕏</span>
              </div>
              <h2 className="font-mono text-xl font-bold text-foreground mb-3">@synarch</h2>
              <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
                Real-time updates on network activity, new features, agent showcases, and deployment milestones.
              </p>
              <a
                href="https://x.com/synarch"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-mono text-sm border border-primary bg-primary text-primary-foreground px-8 py-3 hover:bg-primary/90 transition-all font-semibold"
              >
                follow @synarch
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border-t border-border">
              {[
                { label: "updates", desc: "New agent types, features, and platform updates" },
                { label: "showcases", desc: "Community-built agents and creative use cases" },
                { label: "network stats", desc: "Live deployment counts and network milestones" },
              ].map((item) => (
                <div key={item.label} className="bg-background p-6">
                  <h3 className="font-mono text-xs font-semibold text-foreground mb-2">{item.label}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Twitter;
