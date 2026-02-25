import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  const path = segments[segments.length - 1] || "";

  try {
    // POST /register
    if (req.method === "POST" && path === "register") {
      const body = await req.json();
      const { agent_type, github_username, agent_name, description, config } = body;

      if (!agent_type || !["worker", "analyzer", "orchestrator"].includes(agent_type)) {
        return json({ error: "agent_type must be 'worker', 'analyzer', or 'orchestrator'" }, 400);
      }

      const { count } = await supabase
        .from("deployed_forks")
        .select("*", { count: "exact", head: true });
      const forkName = `FORK-${String((count ?? 0) + 1).padStart(4, "0")}`;

      const { data, error } = await supabase
        .from("deployed_forks")
        .insert({
          agent_type,
          fork_name: forkName,
          github_username: github_username || null,
          agent_name: agent_name || null,
          description: description || null,
          status: "active",
          log_level: config?.log_level || "info",
          max_retries: config?.max_retries ?? 3,
          auto_restart: config?.auto_restart ?? true,
        })
        .select()
        .single();

      if (error) throw error;

      return json(data, 201);
    }

    // POST /heartbeat
    if (req.method === "POST" && path === "heartbeat") {
      const { agent_id, status } = await req.json();

      if (!agent_id || !status) return json({ error: "agent_id and status required" }, 400);
      if (!["active", "idle", "offline"].includes(status)) return json({ error: "invalid status" }, 400);

      const { error } = await supabase
        .from("deployed_forks")
        .update({ status })
        .eq("id", agent_id);

      if (error) throw error;

      return json({ ok: true });
    }

    // POST /log — persist agent logs
    if (req.method === "POST" && path === "log") {
      const body = await req.json();
      const { agent_id, level, message, meta } = body;

      if (!agent_id || !message) return json({ error: "agent_id and message required" }, 400);

      const { error } = await supabase
        .from("agent_logs")
        .insert({
          agent_id,
          level: level || "info",
          message,
          meta: meta || {},
        });

      if (error) {
        console.error("Log insert failed:", error);
        // Don't fail the request — logging should be best-effort
      }

      return json({ ok: true });
    }

    // GET /agents
    if (req.method === "GET" && (path === "agents" || path === "agent-api")) {
      const { data, error } = await supabase
        .from("deployed_forks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      return json(data);
    }

    // GET /stats
    if (req.method === "GET" && path === "stats") {
      const { count: totalForks } = await supabase
        .from("deployed_forks")
        .select("*", { count: "exact", head: true });

      const { data: activeForks } = await supabase
        .from("deployed_forks")
        .select("agent_type")
        .eq("status", "active");

      const { count: totalLogs } = await supabase
        .from("agent_logs")
        .select("*", { count: "exact", head: true });

      const byType = { worker: 0, analyzer: 0, orchestrator: 0 };
      (activeForks || []).forEach((f: { agent_type: string }) => {
        if (byType[f.agent_type as keyof typeof byType] !== undefined) {
          byType[f.agent_type as keyof typeof byType]++;
        }
      });

      return json({
        total_forks: totalForks || 0,
        active_forks: (activeForks || []).length,
        total_logs: totalLogs || 0,
        by_type: byType,
      });
    }

    // GET /logs/:agent_id
    if (req.method === "GET" && path === "logs") {
      const agentId = url.searchParams.get("agent_id");
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);

      let query = supabase
        .from("agent_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (agentId) query = query.eq("agent_id", agentId);

      const { data, error } = await query;
      if (error) throw error;

      return json(data);
    }

    return json({
      error: "Not found",
      endpoints: {
        "POST /register": "Register a new agent fork",
        "POST /heartbeat": "Update agent status",
        "POST /log": "Send agent logs (persisted)",
        "GET /agents": "List all agents",
        "GET /stats": "Network statistics",
        "GET /logs?agent_id=&limit=": "Retrieve agent logs",
      },
    }, 404);
  } catch (err) {
    console.error("Agent API error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
