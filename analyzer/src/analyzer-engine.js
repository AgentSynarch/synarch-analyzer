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
        } catch {
          // Fall back to regex-only analysis for files that can't be parsed
          this.logger.debug(`AST parse failed for ${relPath}, using regex analysis`);
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
      // AST-based: measure cyclomatic complexity per function
      const functionNodes = [];
      walk.simple(ast, {
        FunctionDeclaration(node) { functionNodes.push(node); },
        FunctionExpression(node) { functionNodes.push(node); },
        ArrowFunctionExpression(node) { functionNodes.push(node); },
      });

      for (const fn of functionNodes) {
        let complexity = 1; // base
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

        const name = fn.id?.name || (fn.parent?.id?.name) || "anonymous";
        const lineCount = (fn.loc?.end?.line || 0) - (fn.loc?.start?.line || 0) + 1;

        if (complexity > 10) {
          issues.push({
            file, line: fn.loc?.start?.line || 1, severity: complexity > 20 ? "critical" : "warning",
            rule: "complexity", message: `Function '${name}' has cyclomatic complexity of ${complexity} (max: 10)`,
          });
        }

        if (lineCount > 50) {
          issues.push({
            file, line: fn.loc?.start?.line || 1, severity: lineCount > 100 ? "critical" : "warning",
            rule: "complexity", message: `Function '${name}' is ${lineCount} lines long (max: 50)`,
          });
        }

        // Check nesting depth
        let maxDepth = 0;
        const checkDepth = (node, depth) => {
          maxDepth = Math.max(maxDepth, depth);
          walk.simple(node, {
            IfStatement(n) { if (n !== node) checkDepth(n, depth + 1); },
            ForStatement(n) { if (n !== node) checkDepth(n, depth + 1); },
            WhileStatement(n) { if (n !== node) checkDepth(n, depth + 1); },
          });
        };
        checkDepth(fn, 0);

        if (maxDepth > 4) {
          issues.push({
            file, line: fn.loc?.start?.line || 1, severity: "warning",
            rule: "complexity", message: `Function '${name}' has nesting depth of ${maxDepth} (max: 4)`,
          });
        }
      }

      // Check total parameters
      for (const fn of functionNodes) {
        const params = fn.params?.length || 0;
        if (params > 4) {
          issues.push({
            file, line: fn.loc?.start?.line || 1, severity: "warning",
            rule: "complexity", message: `Function has ${params} parameters (max: 4). Consider using an options object.`,
          });
        }
      }
    } else {
      // Fallback: regex-based
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
      // AST-based: track declarations and references
      const declared = new Map(); // name -> { line, type }
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
        Identifier(node) {
          referenced.add(node.name);
        },
      });

      // A declaration counts as one reference, so check if referenced more than once
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
      // Fallback regex
      const varDecls = /(?:const|let|var)\s+(\w+)/g;
      let match;
      while ((match = varDecls.exec(content)) !== null) {
        const varName = match[1];
        const regex = new RegExp(`\\b${varName}\\b`, "g");
        if ((content.match(regex) || []).length === 1) {
          issues.push({
            file, line: content.substring(0, match.index).split("\n").length,
            severity: "info", rule: "unused-vars", message: `'${varName}' is declared but never used`,
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
        issues.push({ file, line: i + 1, severity: "info", rule: "no-console", message: "Console statement left in code" });
      }
      if (/TODO|FIXME|HACK|XXX|BUG/.test(line)) {
        issues.push({ file, line: i + 1, severity: "info", rule: "todo", message: `TODO/FIXME: ${line.trim().substring(0, 80)}` });
      }
      if (/debugger\b/.test(line)) {
        issues.push({ file, line: i + 1, severity: "warning", rule: "no-debugger", message: "Debugger statement left in code" });
      }
      if (/\balert\s*\(/.test(line)) {
        issues.push({ file, line: i + 1, severity: "warning", rule: "no-alert", message: "alert() call detected" });
      }
    });

    // Check for empty catch blocks via AST
    if (ast) {
      walk.simple(ast, {
        CatchClause(node) {
          if (!node.body?.body?.length) {
            issues.push({
              file, line: node.loc?.start?.line || 1, severity: "warning",
              rule: "no-empty-catch", message: "Empty catch block — errors are being silently swallowed",
            });
          }
        },
        // Check for == instead of ===
        BinaryExpression(node) {
          if (node.operator === "==" || node.operator === "!=") {
            issues.push({
              file, line: node.loc?.start?.line || 1, severity: "warning",
              rule: "eqeqeq", message: `Use '${node.operator}=' instead of '${node.operator}' for strict comparison`,
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
      { regex: /\beval\s*\(/, msg: "Use of eval() is a security risk", sev: "critical" },
      { regex: /innerHTML\s*=/, msg: "Direct innerHTML assignment — potential XSS", sev: "critical" },
      { regex: /document\.write\s*\(/, msg: "document.write() — potential XSS", sev: "critical" },
      { regex: /new\s+Function\s*\(/, msg: "new Function() — dynamic code execution risk", sev: "warning" },
      { regex: /password\s*[:=]\s*["'][^"']+["']/, msg: "Hardcoded password detected", sev: "critical" },
      { regex: /api[_-]?key\s*[:=]\s*["'][^"']+["']/, msg: "Hardcoded API key detected", sev: "critical" },
      { regex: /secret\s*[:=]\s*["'][^"']+["']/, msg: "Hardcoded secret detected", sev: "critical" },
      { regex: /token\s*[:=]\s*["'][A-Za-z0-9+/=]{20,}["']/, msg: "Hardcoded token detected", sev: "critical" },
      { regex: /https?:\/\/[^"'\s]*:[^@"'\s]+@/, msg: "Credentials in URL", sev: "critical" },
      { regex: /child_process/, msg: "child_process usage — command injection risk", sev: "warning" },
      { regex: /\.exec\s*\(\s*[`"'].*\$\{/, msg: "Template literal in exec() — injection risk", sev: "critical" },
      { regex: /dangerouslySetInnerHTML/, msg: "dangerouslySetInnerHTML — XSS risk in React", sev: "warning" },
      { regex: /process\.env\.\w+.*sql|query/i, msg: "Environment variable used in SQL — potential injection", sev: "warning" },
    ];

    lines.forEach((line, i) => {
      // Skip comment lines
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;

      for (const p of patterns) {
        if (p.regex.test(line)) {
          issues.push({
            file, line: i + 1, severity: p.sev, rule: "security", message: p.msg,
          });
        }
      }
    });

    // AST-based: check for prototype pollution patterns
    if (ast) {
      walk.simple(ast, {
        MemberExpression(node) {
          if (node.property?.name === "__proto__" || node.property?.value === "__proto__") {
            issues.push({
              file, line: node.loc?.start?.line || 1, severity: "critical",
              rule: "security", message: "Access to __proto__ — prototype pollution risk",
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

    const imports = new Set();
    const usedImports = new Set();

    walk.simple(ast, {
      ImportDeclaration(node) {
        for (const spec of node.specifiers || []) {
          imports.add(spec.local?.name);
        }
      },
      Identifier(node) {
        usedImports.add(node.name);
      },
    });

    // Check for circular-ish patterns (same module imported differently)
    const importSources = [];
    walk.simple(ast, {
      ImportDeclaration(node) {
        importSources.push(node.source?.value);
      },
    });

    const duplicateSources = importSources.filter((s, i) => importSources.indexOf(s) !== i);
    for (const dup of [...new Set(duplicateSources)]) {
      issues.push({
        file, line: 1, severity: "info", rule: "duplicate-import",
        message: `'${dup}' is imported multiple times — consider consolidating`,
      });
    }

    return issues;
  }

  _checkDuplicates(file, content, lines) {
    const issues = [];

    // Check for duplicate lines (potential copy-paste errors)
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
          message: `Line appears ${lineNums.length} times (lines ${lineNums.join(", ")}): "${line.substring(0, 60)}..."`,
        });
      }
    }

    return issues;
  }
}

module.exports = { AnalyzerEngine };
