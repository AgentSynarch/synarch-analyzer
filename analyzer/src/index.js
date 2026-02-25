require("dotenv").config();
const { Logger } = require("./logger");
const { SynarchClient } = require("./synarch-client");
const { AnalyzerEngine } = require("./analyzer-engine");
const { ReportGenerator } = require("./report-generator");
const fs = require("fs");

const logger = new Logger(process.env.LOG_LEVEL || "info");
const client = new SynarchClient(logger);

async function main() {
  const banner = `
  ╔═══════════════════════════════════════╗
  ║   SYNARCH ANALYZER AGENT v2.0.0      ║
  ║   AST-powered code intelligence      ║
  ╚═══════════════════════════════════════╝`;
  console.log(banner);

  logger.info(`Agent: ${process.env.AGENT_NAME || "unnamed"}`);
  logger.info(`Target: ${process.env.ANALYZE_DIR || "."}`);

  const registered = await client.register("analyzer");
  if (!registered) {
    logger.warn("Running in offline mode (API unavailable)");
  } else {
    logger.info("Connected to Synarch network ✓");
  }

  client.startHeartbeat();

  const engine = new AnalyzerEngine(logger, {
    dir: process.env.ANALYZE_DIR || ".",
    includePatterns: (process.env.INCLUDE_PATTERNS || "**/*.js,**/*.ts,**/*.jsx,**/*.tsx").split(","),
    excludePatterns: (process.env.EXCLUDE_PATTERNS || "node_modules/**,dist/**,build/**,.git/**").split(","),
    analyzers: (process.env.ANALYZERS || "complexity,unused-vars,code-smells,security,dependencies,duplicates").split(","),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "524288"), // 512KB
    severityThreshold: process.env.SEVERITY_THRESHOLD || "info",
  });

  logger.info("Running analysis...\n");
  const results = await engine.analyze();

  // Print results
  const sevColors = { critical: "🔴", warning: "🟡", info: "🔵" };
  for (const issue of results.issues) {
    const icon = sevColors[issue.severity] || "⚪";
    logger.info(`${icon} [${issue.severity.toUpperCase()}] ${issue.file}:${issue.line} — ${issue.message} (${issue.rule})`);
  }

  console.log("");
  logger.info(`═══ Analysis Complete ═══`);
  logger.info(`Files scanned: ${results.totalFiles}`);
  logger.info(`Issues found:  ${results.totalIssues}`);
  logger.info(`  🔴 Critical: ${results.summary.critical}`);
  logger.info(`  🟡 Warning:  ${results.summary.warning}`);
  logger.info(`  🔵 Info:     ${results.summary.info}`);

  // Generate reports
  const reporter = new ReportGenerator(logger);
  if (process.env.REPORT_FORMAT !== "none") {
    const format = process.env.REPORT_FORMAT || "json";
    const outputDir = process.env.REPORT_OUTPUT || "./reports";
    await reporter.generate(results, format, outputDir);
  }

  // Report to API
  if (client.agentId) {
    await client.reportLog("info", `Analysis complete`, {
      totalFiles: results.totalFiles,
      totalIssues: results.totalIssues,
      summary: results.summary,
    });
  }

  // Watch mode
  if (process.env.AUTO_RESTART === "true") {
    const interval = parseInt(process.env.WATCH_INTERVAL || "60") * 1000;
    logger.info(`\nWatch mode active — re-analyzing every ${interval / 1000}s`);
    setInterval(async () => {
      logger.info("\n── Re-running analysis ──");
      const r = await engine.analyze();
      logger.info(`Result: ${r.totalFiles} files, ${r.totalIssues} issues (${r.summary.critical} critical)`);
      if (client.agentId) {
        await client.reportLog("info", `Re-analysis complete`, {
          totalFiles: r.totalFiles,
          totalIssues: r.totalIssues,
          summary: r.summary,
        });
      }
    }, interval);
  } else {
    await client.updateStatus("idle");
    process.exit(0);
  }

  const shutdown = async (signal) => {
    logger.info(`\nReceived ${signal}. Shutting down...`);
    await client.updateStatus("offline");
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error(`Fatal: ${err.message}`);
  logger.error(err.stack);
  process.exit(1);
});
