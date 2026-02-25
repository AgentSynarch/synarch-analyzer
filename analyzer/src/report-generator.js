const fs = require("fs");
const path = require("path");

class ReportGenerator {
  constructor(logger) {
    this.logger = logger;
  }

  async generate(results, format, outputDir) {
    fs.mkdirSync(outputDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    switch (format) {
      case "json":
        return this._writeJSON(results, outputDir, timestamp);
      case "markdown":
        return this._writeMarkdown(results, outputDir, timestamp);
      case "html":
        return this._writeHTML(results, outputDir, timestamp);
      default:
        return this._writeJSON(results, outputDir, timestamp);
    }
  }

  _writeJSON(results, dir, ts) {
    const file = path.join(dir, `analysis-${ts}.json`);
    fs.writeFileSync(file, JSON.stringify(results, null, 2));
    this.logger.info(`Report saved: ${file}`);
    return file;
  }

  _writeMarkdown(results, dir, ts) {
    const file = path.join(dir, `analysis-${ts}.md`);
    let md = `# SYNARCH Code Analysis Report\n\n`;
    md += `**Date:** ${results.analyzedAt}\n`;
    md += `**Files scanned:** ${results.totalFiles}\n`;
    md += `**Issues found:** ${results.totalIssues}\n\n`;
    md += `## Summary\n\n`;
    md += `| Severity | Count |\n|----------|-------|\n`;
    md += `| 🔴 Critical | ${results.summary.critical} |\n`;
    md += `| 🟡 Warning | ${results.summary.warning} |\n`;
    md += `| 🔵 Info | ${results.summary.info} |\n\n`;
    md += `## Issues\n\n`;

    const grouped = {};
    for (const issue of results.issues) {
      if (!grouped[issue.file]) grouped[issue.file] = [];
      grouped[issue.file].push(issue);
    }

    for (const [file, fileIssues] of Object.entries(grouped)) {
      md += `### ${file}\n\n`;
      for (const issue of fileIssues) {
        const icon = { critical: "🔴", warning: "🟡", info: "🔵" }[issue.severity] || "⚪";
        md += `- ${icon} **Line ${issue.line}** [${issue.rule}]: ${issue.message}\n`;
      }
      md += "\n";
    }

    fs.writeFileSync(file, md);
    this.logger.info(`Report saved: ${file}`);
    return file;
  }

  _writeHTML(results, dir, ts) {
    const file = path.join(dir, `analysis-${ts}.html`);
    const sevClass = { critical: "#ff4444", warning: "#ffaa00", info: "#4488ff" };

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>SYNARCH Analysis Report</title>
    <style>
      body { font-family: 'Courier New', monospace; background: #0a0a0a; color: #e0e0e0; padding: 40px; }
      h1 { color: #00ff88; } h2 { color: #888; } h3 { color: #aaa; }
      .issue { padding: 8px 12px; margin: 4px 0; border-left: 3px solid; background: #111; }
      .critical { border-color: #ff4444; } .warning { border-color: #ffaa00; } .info { border-color: #4488ff; }
      .stat { display: inline-block; margin-right: 30px; }
      .stat-num { font-size: 24px; font-weight: bold; }
      table { border-collapse: collapse; } th, td { padding: 8px 16px; border: 1px solid #333; }
    </style></head><body>`;

    html += `<h1>⬡ SYNARCH Analysis Report</h1>`;
    html += `<p>Generated: ${results.analyzedAt}</p>`;
    html += `<div>`;
    html += `<span class="stat"><span class="stat-num">${results.totalFiles}</span><br>Files</span>`;
    html += `<span class="stat"><span class="stat-num" style="color:#ff4444">${results.summary.critical}</span><br>Critical</span>`;
    html += `<span class="stat"><span class="stat-num" style="color:#ffaa00">${results.summary.warning}</span><br>Warnings</span>`;
    html += `<span class="stat"><span class="stat-num" style="color:#4488ff">${results.summary.info}</span><br>Info</span>`;
    html += `</div><hr>`;

    const grouped = {};
    for (const issue of results.issues) {
      if (!grouped[issue.file]) grouped[issue.file] = [];
      grouped[issue.file].push(issue);
    }

    for (const [fname, fileIssues] of Object.entries(grouped)) {
      html += `<h3>${fname} (${fileIssues.length} issues)</h3>`;
      for (const issue of fileIssues) {
        html += `<div class="issue ${issue.severity}">`;
        html += `<strong>Line ${issue.line}</strong> [${issue.rule}] ${issue.message}`;
        html += `</div>`;
      }
    }

    html += `</body></html>`;
    fs.writeFileSync(file, html);
    this.logger.info(`Report saved: ${file}`);
    return file;
  }
}

module.exports = { ReportGenerator };
