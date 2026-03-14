# Synarch Analyzer

AST-powered code analysis agent for the Synarch network. Performs cyclomatic complexity measurement, security scanning, unused variable detection, duplicate code identification, and automated report generation in JSON, Markdown, or HTML.

---

## Quickstart

```sh
git clone https://github.com/AgentSynarch/synarch-analyzer.git
cd synarch-analyzer
npm install
echo "AGENT_TOKEN=<your-token>" > .env
npm start
```

Get your `AGENT_TOKEN` from the [Synarch launch page](https://synarch.app/launch) by clicking the Analyzer card.

> **Requirements:** Node.js 18+, npm

---

## What it does

The analyzer agent scans codebases using Acorn to parse JavaScript and JSX into abstract syntax trees. It walks the AST to measure function complexity, detect security vulnerabilities, find unused variables, and identify code duplication. Results are output as structured reports.

### Analysis modules

| Module | Method | What it catches |
|--------|--------|----------------|
| Complexity | AST walk | Cyclomatic complexity > 10, functions > 50 lines, nesting depth > 4, parameter count > 4 |
| Security | AST + regex | `eval()`, `innerHTML`, `document.write`, hardcoded passwords/keys/tokens, prototype pollution, command injection |
| Unused vars | AST + regex | Variables and functions declared but never referenced |
| Code smells | AST + regex | Lines > 120 chars, `console.log`, TODO/FIXME, `debugger`, `alert()`, empty catch blocks, `==` vs `===` |
| Dependencies | AST | Duplicate imports from the same module |
| Duplicates | Line comparison | Lines appearing 3+ times (excluding imports, braces, comments) |

---

## How it works

### Analysis pipeline

```
Glob file patterns
  |
  |-- For each file:
  |     |-- Check file size (skip if > maxFileSize)
  |     |-- Read file contents
  |     |-- Attempt AST parse with Acorn (JSX-aware)
  |     |     |-- Success: run AST-based analyzers
  |     |     |-- Failure: fall back to regex-only analysis
  |     |-- Run enabled analyzer modules
  |     |-- Collect issues with file, line, severity, rule, message
  |
  |-- Filter by severity threshold
  |-- Generate summary counts
  |-- Output report (JSON / Markdown / HTML)
```

### AST parsing

The analyzer uses Acorn with the JSX plugin to parse modern JavaScript:

- ECMAScript latest (ES2024+)
- JSX syntax support
- ES modules and CommonJS
- Source locations for accurate line reporting
- Graceful fallback to regex when parsing fails

### Complexity measurement

For each function in the AST, the analyzer counts:

| Construct | Complexity increment |
|-----------|---------------------|
| `if` | +1 |
| Ternary `? :` | +1 |
| `switch case` | +1 |
| `for` / `for...in` / `for...of` | +1 |
| `while` / `do...while` | +1 |
| `&&` / `\|\|` | +1 |
| `catch` | +1 |

Functions with complexity > 10 are flagged as warnings. Above 20, they become critical.

### Security patterns

The security module checks for patterns that indicate real vulnerabilities:

| Pattern | Severity | Risk |
|---------|----------|------|
| `eval()` | Critical | Arbitrary code execution |
| `innerHTML =` | Critical | Cross-site scripting (XSS) |
| `document.write()` | Critical | XSS injection point |
| Hardcoded passwords | Critical | Credential exposure |
| Hardcoded API keys | Critical | Secret leakage |
| Hardcoded tokens | Critical | Authentication bypass |
| Credentials in URLs | Critical | Credential exposure in logs |
| Template literal in `exec()` | Critical | Command injection |
| `__proto__` access | Critical | Prototype pollution |
| `new Function()` | Warning | Dynamic code execution |
| `child_process` | Warning | Command injection surface |
| `dangerouslySetInnerHTML` | Warning | React XSS vector |
| `process.env` in SQL | Warning | SQL injection |

---

## Report formats

### JSON

Structured output with full issue details, suitable for programmatic consumption:

```json
{
  "totalFiles": 42,
  "skippedFiles": 0,
  "totalIssues": 7,
  "issues": [
    {
      "file": "src/handler.js",
      "line": 23,
      "severity": "critical",
      "rule": "security",
      "message": "Use of eval() is a security risk"
    }
  ],
  "summary": { "critical": 1, "warning": 3, "info": 3 },
  "analyzedAt": "2026-03-05T12:00:00.000Z"
}
```

### Markdown

Human-readable report grouped by file, with severity icons and line numbers. Suitable for pull request comments or documentation.

### HTML

Standalone HTML page with dark theme, severity-colored issue cards, and summary statistics. Opens in any browser.

---

## Configuration

All configuration is done via the `.env` file:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AGENT_TOKEN` | Yes | -- | Unique token from Synarch launch page |
| `SYNARCH_API_URL` | No | -- | API endpoint URL |
| `AGENT_NAME` | No | unnamed | Display name in the registry |
| `ANALYZE_DIR` | No | `.` | Directory to scan |
| `INCLUDE_PATTERNS` | No | `**/*.js,**/*.ts,**/*.jsx,**/*.tsx` | Glob patterns to include |
| `EXCLUDE_PATTERNS` | No | `node_modules/**,dist/**,.git/**` | Glob patterns to exclude |
| `ANALYZERS` | No | `complexity,unused-vars,code-smells,security,dependencies,duplicates` | Comma-separated list of enabled analyzers |
| `REPORT_FORMAT` | No | `json` | Output format: `json`, `markdown`, or `html` |
| `OUTPUT_DIR` | No | `./reports` | Directory for generated reports |
| `SEVERITY_THRESHOLD` | No | `info` | Minimum severity to include: `info`, `warning`, `critical` |
| `MAX_FILE_SIZE` | No | 524288 | Maximum file size in bytes (512KB) |
| `HEARTBEAT_INTERVAL` | No | 30 | Heartbeat frequency in seconds |
| `LOG_LEVEL` | No | info | Logging level |

---

## Extending the analyzer

### Adding a custom check

Add logic to `analyzer-engine.js` or create a new method following the pattern:

```js
_checkCustomRule(file, content, lines, ast) {
  const issues = [];

  if (ast) {
    // AST-based analysis (preferred)
    walk.simple(ast, {
      CallExpression(node) {
        if (node.callee?.name === "dangerousFunction") {
          issues.push({
            file,
            line: node.loc?.start?.line || 1,
            severity: "warning",
            rule: "custom-rule",
            message: "Avoid using dangerousFunction()",
          });
        }
      },
    });
  } else {
    // Regex fallback
    lines.forEach((line, i) => {
      if (/dangerousFunction\(/.test(line)) {
        issues.push({
          file, line: i + 1, severity: "warning",
          rule: "custom-rule", message: "Avoid using dangerousFunction()",
        });
      }
    });
  }

  return issues;
}
```

Then enable it in the analysis loop inside the `analyze()` method.

---

## Project structure

```
synarch-analyzer/
  src/
    index.js              -- Entry point, startup sequence, analysis loop
    synarch-client.js     -- Network registration, heartbeats, log reporting
    analyzer-engine.js    -- Core analysis: complexity, security, smells, duplicates
    report-generator.js   -- JSON, Markdown, and HTML report output
    logger.js             -- Structured logging with configurable levels
    self-test.js          -- Connectivity and module integrity verification
  package.json
  .env.example
```

### Dependencies

| Package | Purpose |
|---------|---------|
| `acorn` | JavaScript parser (AST generation) |
| `acorn-walk` | AST traversal utilities |
| `acorn-jsx` | JSX syntax support for Acorn |
| `glob` | File pattern matching |
| `axios` | HTTP client for API communication |
| `winston` | Structured logging |
| `dotenv` | Environment variable loading |

---

## Self-test

Run `npm test` to verify:

- Environment variables are configured
- Network connectivity is available
- Agent token is valid
- Acorn parser loads correctly
- All analyzer modules are functional

---

## License

MIT
