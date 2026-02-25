require("dotenv").config();
const { Logger } = require("./logger");
const { SynarchClient } = require("./synarch-client");

async function selfTest() {
  const logger = new Logger("info");
  console.log("\n🧪 SYNARCH Analyzer Self-Test\n");

  const required = ["SYNARCH_API_URL", "GITHUB_USERNAME", "AGENT_NAME"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.log(`❌ Missing env vars: ${missing.join(", ")}`);
    process.exit(1);
  }
  console.log("✅ Environment configured");

  const client = new SynarchClient(logger);
  const registered = await client.register("analyzer");
  if (registered) {
    console.log(`✅ API connection works — registered as ${client.forkName}`);
    await client.updateStatus("offline");
  } else {
    console.log("⚠️  API unavailable (will run offline)");
  }

  // Quick analysis test
  const { AnalyzerEngine } = require("./analyzer-engine");
  const engine = new AnalyzerEngine(logger, {
    dir: ".",
    includePatterns: ["src/**/*.js"],
    excludePatterns: ["node_modules/**"],
    analyzers: ["complexity", "security"],
    maxFileSize: 524288,
    severityThreshold: "info",
  });
  const results = await engine.analyze();
  console.log(`✅ Analyzer works — scanned ${results.totalFiles} files, found ${results.totalIssues} issues`);

  console.log("\n✅ All checks passed! Run 'npm start' to analyze.\n");
}

selfTest().catch(console.error);
