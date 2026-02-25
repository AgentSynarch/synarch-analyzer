import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import { AgentGraph } from "@/components/AgentGraph";
import { AgentTable } from "@/components/AgentTable";
import { Features } from "@/components/Features";
import { ApiSection } from "@/components/ApiSection";

import { ForkTracker } from "@/components/ForkTracker";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

const Index = () => {
  const [totalForks, setTotalForks] = useState(0);
  const [activeForks, setActiveForks] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      const { count: total } = await supabase
        .from("deployed_forks")
        .select("*", { count: "exact", head: true });
      const { count: active } = await supabase
        .from("deployed_forks")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");
      setTotalForks(total ?? 0);
      setActiveForks(active ?? 0);
    };

    fetchStats();

    const channel = supabase
      .channel("stats")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "deployed_forks" },
        () => {
          setTotalForks((p) => p + 1);
          setActiveForks((p) => p + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const liveStats = [
    { value: 1, label: "main agent", suffix: "" },
    { value: activeForks, label: "active forks", suffix: "" },
    { value: totalForks, label: "total deployed", suffix: "" },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-14 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />

        <div className="relative mx-auto max-w-6xl px-6 py-24 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 border border-primary/40 px-3 py-1 mb-8">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            <span className="font-mono text-[10px] text-primary tracking-widest uppercase">
              system online — main agent active
            </span>
          </div>

          <h1 className="font-mono text-5xl md:text-7xl font-bold text-foreground mb-4 leading-none">
            SYN
            <span className="text-primary text-glow">ARCH</span>
          </h1>
          <p className="font-mono text-sm text-muted-foreground max-w-md mx-auto mb-12 leading-relaxed">
            one main agent. infinite forks. <br />
            hierarchical ai networks, deployed in seconds.
          </p>

          <div className="flex items-center justify-center gap-4 mb-16">
            <Link to="/launch" className="font-mono text-sm border border-primary bg-primary text-primary-foreground px-8 py-2.5 hover:bg-primary/90 transition-all duration-200 font-semibold">
              fork an agent
            </Link>
            <Link to="/docs" className="font-mono text-sm border border-border text-muted-foreground px-8 py-2.5 hover:border-foreground hover:text-foreground transition-all duration-200">
              read docs
            </Link>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 border border-border divide-x divide-border">
            {liveStats.map((stat) => (
              <div key={stat.label} className="py-5 px-6 bg-card/60 backdrop-blur-sm text-center">
                <div className="font-mono text-2xl font-bold text-primary mb-1 transition-all duration-700">
                  {stat.value}{stat.suffix}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agent graph visualization */}
      <section className="mx-auto max-w-6xl px-6 py-16 border-t border-border">
        <div className="mb-8">
          <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-2">
            // network topology
          </p>
          <h2 className="font-mono text-xl font-bold text-foreground">live agent graph</h2>
        </div>
        <div className="border border-border bg-card/30 p-8">
          <AgentGraph />
        </div>
      </section>

      {/* Agent table */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="mb-6">
          <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-2">
            // control panel
          </p>
        </div>
        <AgentTable />
      </section>

      {/* Features */}
      <div className="mx-auto max-w-6xl px-6">
        <Features />
      </div>



      {/* Fork tracker */}
      <div className="mx-auto max-w-6xl px-6">
        <ForkTracker />
      </div>

      {/* API section */}
      <div className="mx-auto max-w-6xl px-6">
        <ApiSection />
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-8">
        <div className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Synarch logo" className="w-7 h-7 object-contain" />
            <span className="font-mono text-xs text-muted-foreground">SYNARCH © 2026</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            <span className="font-mono text-[10px] text-muted-foreground">all systems operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
