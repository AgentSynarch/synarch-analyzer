const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

class Logger {
  constructor(level = "info") {
    this.level = LEVELS[level] ?? 1;
  }

  _log(level, msg) {
    if (LEVELS[level] >= this.level) {
      const ts = new Date().toISOString();
      console.log(`[${ts}] [${level.toUpperCase()}] ${msg}`);
    }
  }

  debug(msg) { this._log("debug", msg); }
  info(msg) { this._log("info", msg); }
  warn(msg) { this._log("warn", msg); }
  error(msg) { this._log("error", msg); }
}

module.exports = { Logger };
