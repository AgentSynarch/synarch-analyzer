const axios = require("axios");

class SynarchClient {
  constructor(logger) {
    this.logger = logger;
    this.apiUrl = process.env.SYNARCH_API_URL;
    this.agentToken = process.env.AGENT_TOKEN;
    this.agentId = null;
    this.forkName = null;
    this.heartbeatTimer = null;
  }

  async register(agentType) {
    if (this.agentToken) {
      this.agentId = this.agentToken;
      this.logger.info(`Using pre-registered agent token: ${this.agentToken}`);
      try {
        await axios.post(`${this.apiUrl}/heartbeat`, { agent_id: this.agentToken, status: "active" });
        this.logger.info("Agent activated ✓");
        const res = await axios.get(`${this.apiUrl}/agents`);
        const me = res.data?.find((a) => a.id === this.agentToken);
        if (me) {
          this.forkName = me.fork_name;
          this.logger.info(`Connected as ${this.forkName} (${me.agent_type})`);
        }
        return true;
      } catch (err) {
        this.logger.error(`Token activation failed: ${err.response?.data?.error || err.message}`);
        return false;
      }
    }

    try {
      const res = await axios.post(`${this.apiUrl}/register`, {
        agent_type: agentType,
        github_username: process.env.GITHUB_USERNAME,
        agent_name: process.env.AGENT_NAME,
        description: process.env.AGENT_DESCRIPTION,
        config: {
          log_level: process.env.LOG_LEVEL || "info",
          max_retries: parseInt(process.env.MAX_RETRIES || "5"),
          auto_restart: process.env.AUTO_RESTART === "true",
        },
      });
      this.agentId = res.data.id;
      this.forkName = res.data.fork_name;
      this.logger.info(`Registered as ${this.forkName} (ID: ${this.agentId})`);
      return true;
    } catch (err) {
      this.logger.error(`Registration failed: ${err.response?.data?.error || err.message}`);
      return false;
    }
  }

  startHeartbeat() {
    const interval = parseInt(process.env.HEARTBEAT_INTERVAL || "30") * 1000;
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), interval);
  }

  async sendHeartbeat() {
    if (!this.agentId) return;
    try { await axios.post(`${this.apiUrl}/heartbeat`, { agent_id: this.agentId, status: "active" }); } catch {}
  }

  async updateStatus(status) {
    if (!this.agentId) return;
    try { await axios.post(`${this.apiUrl}/heartbeat`, { agent_id: this.agentId, status }); } catch {}
  }

  async reportLog(level, message, meta = {}) {
    if (!this.agentId) return;
    try { await axios.post(`${this.apiUrl}/log`, { agent_id: this.agentId, level, message, meta }); } catch {}
  }
}

module.exports = { SynarchClient };
