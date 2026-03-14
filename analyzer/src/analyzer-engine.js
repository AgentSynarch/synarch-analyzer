const fs = require("fs");
const path = require("path");
const { glob } = require("glob");
const acorn = require("acorn");
const jsx = require("acorn-jsx");
const walk = require("acorn-walk");

const JsxParser = acorn.Parser.extend(jsx());

class AnalyzerEngine {
  constructor(logger, options) {
    this.logger = logger;
    this.dir = path.resolve(options.dir);
    this.includePatterns = options.includePatterns;
    this.excludePatterns = options.excludePatterns;
    this.enabledAnalyzers = options.analyzers;
    this.maxFileSize = options.maxFileSize || 524288;
    this.severityThreshold = options.severityThreshold || "info";
  }

  async analyze() {
    const files = await this._getFiles();
    const issues = [];
    let skipped = 0;
    let astSuccesses = 0;
    let astFailures = 0;

    for (const file of files) {
      try {
        const stat = fs.statSync(file);
        if (stat.size > this.maxFileSize) {
          this.logger.warn(`Skipping ${path.relative(this.dir, file)}: exceeds max file size`);
          skipped++;
          continue;
        }

        const content = fs.readFileSync(file, "utf-8");
        const lines = content.split("\n");
        const relPath = path.relative(this.dir, file);

        // Try AST parsing
        let ast = null;
        try {
          ast = JsxParser.parse(content, {
            sourceType: "module",
            ecmaVersion: "latest",
            locations: true,
            allowImportExportEverywhere: true,
            allowReturnOutsideFunction: true,
          });
          astSuccesses++;
        } catch {
          astFailures++;
          this.logger.debug(`AST parse failed for ${relPath}, using regex fallback`);
        }

        if (this.enabledAnalyzers.includes("complexity"))
          issues.push(...this._checkComplexity(relPath, content, lines, ast));
        if (this.enabledAnalyzers.includes("unused-vars"))
          issues.push(...this._checkUnusedVars(relPath, content, lines, ast));
        if (this.enabledAnalyzers.includes("code-smells"))
          issues.push(...this._checkCodeSmells(relPath, content, lines, ast));
        if (this.enabledAnalyzers.includes("security"))
          issues.push(...this._checkSecurity(relPath, content, lines, ast));
        if (this.enabledAnalyzers.includes("dependencies"))
          issues.push(...this._checkDependencies(relPath, content, lines, ast));
        if (this.enabledAnalyzers.includes("duplicates"))
          issues.push(...this._checkDuplicates(relPath, content, lines));
      } catch (err) {
        this.logger.warn(`Error analyzing ${path.relative(this.dir, file)}: ${err.message}`);
      }
    }

    // Filter by severity threshold
    const severityOrder = { info: 0, warning: 1, critical: 2 };
    const threshold = severityOrder[this.severityThreshold] || 0;
    const filtered = issues.filter((i) => (severityOrder[i.severity] || 0) >= threshold);

    const summary = {
      critical: filtered.filter((i) => i.severity === "critical").length,
      warning: filtered.filter((i) => i.severity === "warning").length,
      info: filtered.filter((i) => i.severity === "info").length,
    };

    return {
      totalFiles: files.length,
      skippedFiles: skipped,
      astSuccesses,
      astFailures,
      totalIssues: filtered.length,
      issues: filtered,
      summary,
      analyzedAt: new Date().toISOString(),
    };
  }

  async _getFiles() {
    const allFiles = [];
    for (const pattern of this.includePatterns) {
      const found = await glob(pattern.trim(), {
        cwd: this.dir,
        ignore: this.excludePatterns.map((p) => p.trim()),
        absolute: true,
      });
      allFiles.push(...found);
    }
    return [...new Set(allFiles)];
  }

  _checkComplexity(file, content, lines, ast) {
    const issues = [];

    if (ast) {
      const functionNodes = [];
      walk.simple(ast, {
        FunctionDeclaration(node) { functionNodes.push(node); },
        FunctionExpression(node) { functionNodes.push(node); },
        ArrowFunctionExpression(node) { functionNodes.push(node); },
      });

      for (const fn of functionNodes) {
        let complexity = 1;
        walk.simple(fn, {
          IfStatement() { complexity++; },
          ConditionalExpression() { complexity++; },
          SwitchCase() { complexity++; },
          ForStatement() { complexity++; },
          ForInStatement() { complexity++; },
          ForOfStatement() { complexity++; },
          WhileStatement() { complexity++; },
          DoWhileStatement() { complexity++; },
          LogicalExpression(node) { if (node.operator === "&&" || node.operator === "||") complexity++; },
          CatchClause() { complexity++; },
        });

        const name = fn.id?.name || "anonymous";
        const lineCount = (fn.loc?.end?.line || 0) - (fn.loc?.start?.line || 0) + 1;
        const params = fn.params?.length || 0;

        if (complexity > 10) {
          issues.push({
            file, line: fn.loc?.start?.line || 1,
            severity: complexity > 20 ? "critical" : "warning",
            rule: "complexity",
            message: `Function '${name}' has cyclomatic complexity of ${complexity} (threshold: 10)`,
          });
        }

        if (lineCount > 50) {
          issues.push({
            file, line: fn.loc?.start?.line || 1,
            severity: lineCount > 100 ? "critical" : "warning",
            rule: "function-length",
            message: `Function '${name}' is ${lineCount} lines (threshold: 50)`,
          });
        }

        if (params > 4) {
          issues.push({
            file, line: fn.loc?.start?.line || 1,
            severity: "warning", rule: "max-params",
            message: `Function '${name}' has ${params} parameters (threshold: 4). Use an options object.`,
          });
        }

        // Nesting depth
        let maxDepth = 0;
        const measureDepth = (node, depth) => {
          maxDepth = Math.max(maxDepth, depth);
          walk.simple(node, {
            IfStatement(n) { if (n !== node) measureDepth(n, depth + 1); },
            ForStatement(n) { if (n !== node) measureDepth(n, depth + 1); },
            WhileStatement(n) { if (n !== node) measureDepth(n, depth + 1); },
          });
        };
        measureDepth(fn, 0);

        if (maxDepth > 4) {
          issues.push({
            file, line: fn.loc?.start?.line || 1,
            severity: "warning", rule: "max-depth",
            message: `Function '${name}' has nesting depth of ${maxDepth} (threshold: 4)`,
          });
        }
      }
    } else {
      // Regex fallback
      lines.forEach((line, i) => {
        const indent = line.search(/\S/);
        if (indent > 16) {
          issues.push({
            file, line: i + 1, severity: "warning", rule: "complexity",
            message: `Deeply nested code (${Math.floor(indent / 2)} levels)`,
          });
        }
      });
    }

    return issues;
  }

  _checkUnusedVars(file, content, lines, ast) {
    const issues = [];

    if (ast) {
      const declared = new Map();
      const referenced = new Set();

      walk.simple(ast, {
        VariableDeclarator(node) {
          if (node.id?.type === "Identifier") {
            declared.set(node.id.name, { line: node.loc?.start?.line || 1, type: "variable" });
          }
        },
        FunctionDeclaration(node) {
          if (node.id?.name) {
            declared.set(node.id.name, { line: node.loc?.start?.line || 1, type: "function" });
          }
        },
        Identifier(node) { referenced.add(node.name); },
      });

      for (const [name, info] of declared) {
        const regex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
        const count = (content.match(regex) || []).length;
        if (count <= 1 && !name.startsWith("_")) {
          issues.push({
            file, line: info.line, severity: "info", rule: "unused-vars",
            message: `'${name}' (${info.type}) is declared but never used`,
          });
        }
      }
    } else {
      const varDecls = /(?:const|let|var)\s+(\w+)/g;
      let match;
      while ((match = varDecls.exec(content)) !== null) {
        const varName = match[1];
        const regex = new RegExp(`\\b${varName}\\b`, "g");
        if ((content.match(regex) || []).length === 1) {
          issues.push({
            file, line: content.substring(0, match.index).split("\n").length,
            severity: "info", rule: "unused-vars",
            message: `'${varName}' is declared but never used`,
          });
        }
      }
    }

    return issues;
  }

  _checkCodeSmells(file, content, lines, ast) {
    const issues = [];

    lines.forEach((line, i) => {
      if (line.length > 120) {
        issues.push({ file, line: i + 1, severity: "info", rule: "line-length", message: `Line too long (${line.length} chars, max 120)` });
      }
      if (/console\.(log|debug|info)\(/.test(line) && !file.includes("logger")) {
        issues.push({ file, line: i + 1, severity: "info", rule: "no-console", message: "Console statement in production code" });
      }
      if (/TODO|FIXME|HACK|XXX|BUG/.test(line)) {
        issues.push({ file, line: i + 1, severity: "info", rule: "todo", message: `Unresolved marker: ${line.trim().substring(0, 60)}` });
      }
      if (/debugger\b/.test(line)) {
        issues.push({ file, line: i + 1, severity: "warning", rule: "no-debugger", message: "Debugger statement in code" });
      }
      if (/\balert\s*\(/.test(line)) {
        issues.push({ file, line: i + 1, severity: "warning", rule: "no-alert", message: "alert() call detected" });
      }
    });

    if (ast) {
      walk.simple(ast, {
        CatchClause(node) {
          if (!node.body?.body?.length) {
            issues.push({
              file, line: node.loc?.start?.line || 1, severity: "warning",
              rule: "no-empty-catch", message: "Empty catch block -- errors silently swallowed",
            });
          }
        },
        BinaryExpression(node) {
          if (node.operator === "==" || node.operator === "!=") {
            issues.push({
              file, line: node.loc?.start?.line || 1, severity: "warning",
              rule: "eqeqeq", message: `Use '${node.operator}=' instead of '${node.operator}' for strict equality`,
            });
          }
        },
        ThrowStatement(node) {
          // Check for throw of string literal instead of Error object
          if (node.argument?.type === "Literal" && typeof node.argument.value === "string") {
            issues.push({
              file, line: node.loc?.start?.line || 1, severity: "warning",
              rule: "no-throw-literal", message: "Throw an Error object instead of a string literal",
            });
          }
        },
      });
    }

    return issues;
  }

  _checkSecurity(file, content, lines, ast) {
    const issues = [];

    const patterns = [
      { regex: /\beval\s*\(/, msg: "eval() -- arbitrary code execution", sev: "critical" },
      { regex: /innerHTML\s*=/, msg: "innerHTML assignment -- XSS vector", sev: "critical" },
      { regex: /document\.write\s*\(/, msg: "document.write() -- XSS injection point", sev: "critical" },
      { regex: /new\s+Function\s*\(/, msg: "new Function() -- dynamic code execution", sev: "warning" },
      { regex: /password\s*[:=]\s*["'][^"']+["']/, msg: "Hardcoded password detected", sev: "critical" },
      { regex: /api[_-]?key\s*[:=]\s*["'][^"']+["']/, msg: "Hardcoded API key detected", sev: "critical" },
      { regex: /secret\s*[:=]\s*["'][^"']+["']/, msg: "Hardcoded secret detected", sev: "critical" },
      { regex: /token\s*[:=]\s*["'][A-Za-z0-9+/=]{20,}["']/, msg: "Hardcoded token detected", sev: "critical" },
      { regex: /https?:\/\/[^"'\s]*:[^@"'\s]+@/, msg: "Credentials embedded in URL", sev: "critical" },
      { regex: /child_process/, msg: "child_process import -- command injection surface", sev: "warning" },
      { regex: /\.exec\s*\(\s*[`"'].*\$\{/, msg: "Template literal in exec() -- command injection", sev: "critical" },
      { regex: /dangerouslySetInnerHTML/, msg: "dangerouslySetInnerHTML -- React XSS vector", sev: "warning" },
      { regex: /process\.env\.\w+.*sql|query/i, msg: "Environment variable in SQL context -- injection risk", sev: "warning" },
      { regex: /crypto\.createHash\s*\(\s*["']md5["']\s*\)/, msg: "MD5 hash -- use SHA-256 or stronger", sev: "warning" },
      { regex: /Math\.random\s*\(/, msg: "Math.random() is not cryptographically secure", sev: "info" },
      { regex: /\bexecSync\s*\(/, msg: "execSync() -- synchronous shell execution", sev: "warning" },
      { regex: /\bspawnSync\s*\(/, msg: "spawnSync() -- synchronous process spawn", sev: "warning" },
      { regex: /disable.*ssl|rejectUnauthorized\s*:\s*false/i, msg: "SSL verification disabled", sev: "critical" },
    ];

    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;

      for (const p of patterns) {
        if (p.regex.test(line)) {
          issues.push({ file, line: i + 1, severity: p.sev, rule: "security", message: p.msg });
        }
      }
    });

    // AST-based prototype pollution detection
    if (ast) {
      walk.simple(ast, {
        MemberExpression(node) {
          if (node.property?.name === "__proto__" || node.property?.value === "__proto__") {
            issues.push({
              file, line: node.loc?.start?.line || 1, severity: "critical",
              rule: "security", message: "__proto__ access -- prototype pollution risk",
            });
          }
          if (node.property?.name === "constructor" && node.object?.property?.name === "prototype") {
            issues.push({
              file, line: node.loc?.start?.line || 1, severity: "warning",
              rule: "security", message: "prototype.constructor access -- potential pollution",
            });
          }
        },
        AssignmentExpression(node) {
          // Detect Object.assign with user input going into prototype
          if (node.right?.type === "CallExpression" && node.right.callee?.property?.name === "assign") {
            issues.push({
              file, line: node.loc?.start?.line || 1, severity: "info",
              rule: "security", message: "Object.assign -- verify no user-controlled keys reach prototype",
            });
          }
        },
      });
    }

    return issues;
  }

  _checkDependencies(file, content, lines, ast) {
    const issues = [];
    if (!ast) return issues;

    const importSources = [];
    walk.simple(ast, {
      ImportDeclaration(node) { importSources.push(node.source?.value); },
    });

    const duplicateSources = importSources.filter((s, i) => importSources.indexOf(s) !== i);
    for (const dup of [...new Set(duplicateSources)]) {
      issues.push({
        file, line: 1, severity: "info", rule: "duplicate-import",
        message: `'${dup}' imported multiple times -- consolidate`,
      });
    }

    return issues;
  }

  _checkDuplicates(file, content, lines) {
    const issues = [];

    const lineMap = new Map();
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (trimmed.length < 20 || trimmed.startsWith("//") || trimmed.startsWith("import") || trimmed === "{" || trimmed === "}") return;
      if (!lineMap.has(trimmed)) lineMap.set(trimmed, []);
      lineMap.get(trimmed).push(i + 1);
    });

    for (const [line, lineNums] of lineMap) {
      if (lineNums.length >= 3) {
        issues.push({
          file, line: lineNums[0], severity: "info", rule: "duplicates",
          message: `Repeated ${lineNums.length} times (lines ${lineNums.join(", ")}): "${line.substring(0, 50)}..."`,
        });
      }
    }

    return issues;
  }
}

module.exports = { AnalyzerEngine };
