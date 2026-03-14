require("dotenv").config();
const { Logger, COLORS } = require("./logger");
const { SynarchClient } = require("./synarch-client");
const { AnalyzerEngine } = require("./analyzer-engine");
const { ReportGenerator } = require("./report-generator");

const logger = new Logger(process.env.LOG_LEVEL || "info");
const client = new SynarchClient(logger);

async function main() {
  console.log(`
${COLORS.cyan}  ╔═══════════════════════════════════════════╗
  ║                                           ║
  ║   SYNARCH ANALYZER AGENT  v2.1.0          ║
  ║   AST-powered code intelligence           ║
  ║                                           ║
  ╚═══════════════════════════════════════════╝${COLORS.reset}
`);

  logger.info("Initializing analyzer agent", {
    agent: process.env.AGENT_NAME || "unnamed",
    target: process.env.ANALYZE_DIR || ".",
    format: process.env.REPORT_FORMAT || "json",
    threshold: process.env.SEVERITY_THRESHOLD || "info",
    pid: process.pid,
    node: process.version,
  });

  const registered = await client.register("analyzer");
  if (!registered) {
    logger.warn("Running in offline mode -- API unavailable");
  } else {
    logger.info("Connected to Synarch network");
  }

  client.startHeartbeat();

  const engine = new AnalyzerEngine(logger, {
    dir: process.env.ANALYZE_DIR || ".",
    includePatterns: (process.env.INCLUDE_PATTERNS || "**/*.js,**/*.ts,**/*.jsx,**/*.tsx").split(","),
    excludePatterns: (process.env.EXCLUDE_PATTERNS || "node_modules/**,dist/**,build/**,.git/**").split(","),
    analyzers: (process.env.ANALYZERS || "complexity,unused-vars,code-smells,security,dependencies,duplicates").split(","),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "524288"),
    severityThreshold: process.env.SEVERITY_THRESHOLD || "info",
  });

  logger.separator("ANALYSIS");
  const startTime = Date.now();
  const results = await engine.analyze();
  const duration = Date.now() - startTime;

  // Print issues with severity indicators
  const sevMarkers = { critical: `${COLORS.red}CRIT${COLORS.reset}`, warning: `${COLORS.yellow}WARN${COLORS.reset}`, info: `${COLORS.blue}INFO${COLORS.reset}` };

  for (const issue of results.issues) {
    const marker = sevMarkers[issue.severity] || "----";
    logger.info(`[${marker}] ${issue.file}:${issue.line} -- ${issue.message}`, { rule: issue.rule });
  }

  // Summary
  logger.separator("SUMMARY");
  const summaryData = [
    { metric: "Files scanned", value: results.totalFiles },
    { metric: "Files skipped", value: results.skippedFiles },
    { metric: "Total issues", value: results.totalIssues },
    { metric: "Critical", value: results.summary.critical },
    { metric: "Warnings", value: results.summary.warning },
    { metric: "Info", value: results.summary.info },
    { metric: "Duration", value: `${duration}ms` },
  ];
  logger.table(summaryData);

  // Generate reports
  const reporter = new ReportGenerator(logger);
  if (process.env.REPORT_FORMAT !== "none") {
    const format = process.env.REPORT_FORMAT || "json";
    const outputDir = process.env.REPORT_OUTPUT || "./reports";
    await reporter.generate(results, format, outputDir);
  }

  // Report to network
  if (client.agentId) {
    await client.reportLog("info", "Analysis complete", {
      totalFiles: results.totalFiles,
      totalIssues: results.totalIssues,
      summary: results.summary,
      duration,
    });
  }

  // Watch mode
  if (process.env.AUTO_RESTART === "true") {
    const interval = parseInt(process.env.WATCH_INTERVAL || "60") * 1000;
    logger.info(`Watch mode active -- re-analyzing every ${interval / 1000}s`);
    setInterval(async () => {
      logger.separator("RE-ANALYSIS");
      const r = await engine.analyze();
      logger.info(`Result`, { files: r.totalFiles, issues: r.totalIssues, critical: r.summary.critical });
      if (client.agentId) {
        await client.reportLog("info", "Re-analysis complete", {
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
    logger.separator("SHUTDOWN");
    logger.info(`Received ${signal}, shutting down...`);
    await client.updateStatus("offline");
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error(`Fatal: ${err.message}`, { stack: err.stack });
  process.exit(1);
});
