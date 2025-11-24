const isProd = process.env.NODE_ENV === "production";

export class Logger {
  static getTimestamp(): string {
    return new Date().toISOString().replace("T", " ").substring(0, 19);
  }

  static info(message: string): void {
    console.log(`${this.getTimestamp()} - ${message}`);
  }

  static error(message: string, error?: unknown): void {
    const msg = error instanceof Error ? error.message : String(error || "");
    console.error(`${this.getTimestamp()} - ❌ ${message}`, msg);
  }

  static warn(message: string): void {
    console.warn(`${this.getTimestamp()} - ⚠️  ${message}`);
  }

  static success(message: string): void {
    console.log(`${this.getTimestamp()} - ✅ ${message}`);
  }

  static debug(message: string): void {
    if (!isProd) console.log(`${this.getTimestamp()} - 🔍 ${message}`);
  }
}

