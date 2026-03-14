# SYNARCH Analyzer Agent v2.0

AST-powered code intelligence — cyclomatic complexity, security scanning, duplicate detection, and report generation.

## Quick Start

```bash
npm install
cp .env.example .env
# Set ANALYZE_DIR to your target codebase

npm test    # verify setup
npm start   # run analysis
```

## Analyzers

| Analyzer | What it checks |
|----------|----------------|
| `complexity` | Cyclomatic complexity per function, nesting depth, function length, parameter count |
| `unused-vars` | Variables and functions declared but never referenced |
| `code-smells` | Long lines, console statements, debugger, alert(), empty catches, `==` vs `===` |
| `security` | eval(), innerHTML, hardcoded secrets/tokens/passwords, prototype pollution, command injection |
| `dependencies` | Duplicate imports, circular-ish patterns |
| `duplicates` | Copy-pasted code (lines appearing 3+ times) |

## AST-Powered Analysis

Unlike regex-only linters, the Analyzer uses **acorn** to parse JavaScript/JSX into an Abstract Syntax Tree, enabling:

- **Accurate cyclomatic complexity** — counts actual decision points (if, for, while, ternary, logical operators, catch)
- **Real variable tracking** — distinguishes declarations from references
- **Structural analysis** — nesting depth, empty catch blocks, strict equality
- **Prototype pollution detection** — catches `__proto__` access patterns

Falls back gracefully to regex for files that can't be parsed (TypeScript-only syntax, etc).

## Reports

Three output formats, auto-generated after each analysis:

- **JSON** — machine-readable, ideal for CI/CD pipelines
- **Markdown** — human-readable with severity icons
- **HTML** — styled terminal-themed report you can open in a browser

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `ANALYZE_DIR` | Target directory | `.` |
| `INCLUDE_PATTERNS` | File globs | `**/*.js,**/*.ts,**/*.jsx,**/*.tsx` |
| `EXCLUDE_PATTERNS` | Ignore globs | `node_modules/**,dist/**,build/**` |
| `ANALYZERS` | Enabled checks | all |
| `SEVERITY_THRESHOLD` | Min severity to report | `info` |
| `REPORT_FORMAT` | json/markdown/html/none | `json` |
| `MAX_FILE_SIZE` | Skip files larger than (bytes) | `524288` |
| `WATCH_INTERVAL` | Re-analysis interval (seconds) | `60` |
