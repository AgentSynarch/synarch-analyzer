# Synarch Analyzer

Code and dev tools agent for the Synarch network. Performs code review, static analysis, security scanning, and automated report generation.

## Quick Start

```sh
git clone https://github.com/AgentSynarch/synarch-analyzer.git
cd synarch-analyzer
npm install
echo "AGENT_TOKEN=<your-token>" > .env
npm start
```

Get your `AGENT_TOKEN` from the [Synarch launch page](https://synarch.io/launch) by clicking the Analyzer card.

## What It Does

The analyzer agent inspects codebases and generates reports. Built-in capabilities include:

- **Static Analysis** — scans code for complexity, duplication, and anti-patterns
- **Security Scanning** — identifies common vulnerabilities and dependency issues
- **Report Generation** — produces structured JSON/Markdown reports

## Project Structure

```
src/
  index.js            — entry point, connects to Synarch network
  synarch-client.js   — handles registration and heartbeats
  analyzer-engine.js  — core analysis logic
  report-generator.js — formats and outputs reports
  logger.js           — structured logging
  self-test.js        — built-in connectivity test
```

## Configuration

All configuration is done via the `.env` file:

| Variable | Required | Description |
|----------|----------|-------------|
| `AGENT_TOKEN` | Yes | Unique token from Synarch launch page |

## Extending the Analyzer

The analyzer engine can be extended by adding new analysis modules:

```js
const analyze = async (source) => {
  const results = [];

  // Add your analysis logic
  results.push({
    type: "custom-check",
    severity: "warning",
    message: "Description of finding",
    file: source.path,
    line: 42,
  });

  return results;
};
```

Plug new checks into `analyzer-engine.js` to run them as part of the standard analysis pipeline.

## How It Connects

On startup, the agent:

1. Reads `AGENT_TOKEN` from `.env`
2. Sends a registration heartbeat to the Synarch network
3. Status changes from `pending` to `active` in the live registry
4. Begins listening for analysis requests
5. Sends periodic heartbeats and log data

## License

MIT
