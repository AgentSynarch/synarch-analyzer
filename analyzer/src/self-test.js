require("dotenv").config();
const { Logger, COLORS } = require("./logger");
const { SynarchClient } = require("./synarch-client");

async function selfTest() {
  const logger = new Logger("info");
  const results = [];

  console.log(`
${COLORS.cyan}  SYNARCH Analyzer -- Self-Test${COLORS.reset}
`);

  // 1. Environment
  const envVars = ["SYNARCH_API_URL", "AGENT_NAME"];
  const missing = envVars.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    results.push({ check: "Environment", status: "FAIL", detail: `Missing: ${missing.join(", ")}` });
  } else {
    results.push({ check: "Environment", status: "OK", detail: `${envVars.length} required vars set` });
  }

  // 2. Node.js version
  const nodeVersion = parseInt(process.version.slice(1));
  results.push({
    check: "Node.js",
    status: nodeVersion >= 18 ? "OK" : "FAIL",
    detail: process.version,
  });

  // 3. API connection
  if (missing.length === 0) {
    const client = new SynarchClient(logger);
    const registered = await client.register("analyzer");
    if (registered) {
      results.push({ check: "API", status: "OK", detail: `Registered as ${client.forkName}` });
      await client.updateStatus("offline");
    } else {
      results.push({ check: "API", status: "WARN", detail: "Connection failed (will run offline)" });
    }
  }

  // 4. AST parser
  try {
    const acorn = require("acorn");
    const jsx = require("acorn-jsx");
    const walk = require("acorn-walk");
    const Parser = acorn.Parser.extend(jsx());
    const ast = Parser.parse("const x = 1;", { ecmaVersion: "latest", sourceType: "module" });
    results.push({ check: "AST Parser", status: "OK", detail: "acorn + jsx + walk loaded" });
  } catch (err) {
    results.push({ check: "AST Parser", status: "FAIL", detail: err.message });
  }

  // 5. Analyzer engine
  try {
    const { AnalyzerEngine } = require("./analyzer-engine");
    const engine = new AnalyzerEngine(logger, {
      dir: ".",
      includePatterns: ["src/**/*.js"],
      excludePatterns: ["node_modules/**"],
      analyzers: ["complexity", "security"],
      maxFileSize: 524288,
      severityThreshold: "info",
    });
    const r = await engine.analyze();
    results.push({ check: "Analyzer", status: "OK", detail: `Scanned ${r.totalFiles} files, ${r.totalIssues} issues` });
  } catch (err) {
    results.push({ check: "Analyzer", status: "FAIL", detail: err.message });
  }

  // 6. Report generator
  try {
    const { ReportGenerator } = require("./report-generator");
    new ReportGenerator(logger);
    results.push({ check: "Reports", status: "OK", detail: "json, markdown, html" });
  } catch (err) {
    results.push({ check: "Reports", status: "FAIL", detail: err.message });
  }

  // 7. Dependencies
  const requiredModules = ["acorn", "acorn-walk", "acorn-jsx", "glob", "axios", "dotenv"];
  for (const mod of requiredModules) {
    try {
      require(mod);
      results.push({ check: `Module: ${mod}`, status: "OK", detail: "loaded" });
    } catch {
      results.push({ check: `Module: ${mod}`, status: "FAIL", detail: "not installed" });
    }
  }

  console.log("");
  logger.table(results);
  console.log("");

  const failures = results.filter((r) => r.status === "FAIL");
  if (failures.length > 0) {
    console.log(`${COLORS.red}  ${failures.length} check(s) failed.${COLORS.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${COLORS.green}  All checks passed. Run 'npm start' to analyze.${COLORS.reset}\n`);
  }
}

selfTest().catch((err) => {
  console.error("Self-test crashed:", err.message);
  process.exit(1);
});
