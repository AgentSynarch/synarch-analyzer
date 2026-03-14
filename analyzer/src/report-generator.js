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
    md += `| Critical | ${results.summary.critical} |\n`;
    md += `| Warning | ${results.summary.warning} |\n`;
    md += `| Info | ${results.summary.info} |\n\n`;
    md += `## Issues\n\n`;

    const grouped = {};
    for (const issue of results.issues) {
      if (!grouped[issue.file]) grouped[issue.file] = [];
      grouped[issue.file].push(issue);
    }

    for (const [fname, fileIssues] of Object.entries(grouped)) {
      md += `### ${fname}\n\n`;
      for (const issue of fileIssues) {
        const sev = issue.severity.toUpperCase();
        md += `- **[${sev}]** Line ${issue.line} \`${issue.rule}\`: ${issue.message}\n`;
      }
      md += "\n";
    }

    fs.writeFileSync(file, md);
    this.logger.info(`Report saved: ${file}`);
    return file;
  }

  _writeHTML(results, dir, ts) {
    const file = path.join(dir, `analysis-${ts}.html`);

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SYNARCH Analysis Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
      background: #09090b; color: #a1a1aa; padding: 40px 60px; line-height: 1.6;
    }
    h1 { color: #fafafa; font-size: 20px; font-weight: 600; margin-bottom: 8px; }
    h2 { color: #71717a; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; margin: 32px 0 12px; }
    h3 { color: #d4d4d8; font-size: 14px; margin: 24px 0 8px; }
    .meta { color: #52525b; font-size: 12px; margin-bottom: 32px; }
    .stats { display: flex; gap: 40px; margin: 24px 0 32px; }
    .stat { text-align: center; }
    .stat-num { font-size: 28px; font-weight: 700; display: block; }
    .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #52525b; }
    .stat-critical .stat-num { color: #ef4444; }
    .stat-warning .stat-num { color: #f59e0b; }
    .stat-info .stat-num { color: #3b82f6; }
    .stat-files .stat-num { color: #fafafa; }
    .issue {
      padding: 10px 16px; margin: 4px 0; border-left: 3px solid;
      background: #18181b; font-size: 13px; border-radius: 0 4px 4px 0;
    }
    .issue .line { color: #52525b; margin-right: 8px; }
    .issue .rule { color: #52525b; font-size: 11px; margin-left: 8px; }
    .critical { border-color: #ef4444; }
    .warning { border-color: #f59e0b; }
    .info { border-color: #3b82f6; }
    hr { border: none; border-top: 1px solid #27272a; margin: 32px 0; }
    .file-group { margin-bottom: 24px; }
  </style>
</head>
<body>
  <h1>SYNARCH Analysis Report</h1>
  <div class="meta">Generated ${results.analyzedAt}</div>

  <div class="stats">
    <div class="stat stat-files"><span class="stat-num">${results.totalFiles}</span><span class="stat-label">Files</span></div>
    <div class="stat stat-critical"><span class="stat-num">${results.summary.critical}</span><span class="stat-label">Critical</span></div>
    <div class="stat stat-warning"><span class="stat-num">${results.summary.warning}</span><span class="stat-label">Warnings</span></div>
    <div class="stat stat-info"><span class="stat-num">${results.summary.info}</span><span class="stat-label">Info</span></div>
  </div>
  <hr>`;

    const grouped = {};
    for (const issue of results.issues) {
      if (!grouped[issue.file]) grouped[issue.file] = [];
      grouped[issue.file].push(issue);
    }

    for (const [fname, fileIssues] of Object.entries(grouped)) {
      html += `\n  <div class="file-group">
    <h3>${fname} <span style="color:#52525b">(${fileIssues.length})</span></h3>`;
      for (const issue of fileIssues) {
        html += `\n    <div class="issue ${issue.severity}">
      <span class="line">:${issue.line}</span> ${issue.message} <span class="rule">${issue.rule}</span>
    </div>`;
      }
      html += `\n  </div>`;
    }

    html += `\n</body>\n</html>`;
    fs.writeFileSync(file, html);
    this.logger.info(`Report saved: ${file}`);
    return file;
  }
}

module.exports = { ReportGenerator };
