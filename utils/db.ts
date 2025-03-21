// utils/db.ts
import { config } from "./config.ts";

let kv: Deno.Kv | null = null;
let fallbackStore: Map<string, unknown> | null = null;

// Check if Deno KV API is available
const isKvAvailable = typeof Deno.openKv === "function";

/**
 * Initialize the database
 * This should be called before any database operations
 */
export async function initDatabase(): Promise<void> {
  if (kv !== null || fallbackStore !== null) {
    return; // Already initialized
  }

  try {
    if (isKvAvailable) {
      // KV API is available - use it
      if (config.isProduction) {
        kv = await Deno.openKv();
        console.log("Connected to Deno KV in production mode");
      } else {
        // For local development, use a path-based database
        kv = await Deno.openKv(config.database.path);
        console.log(`Connected to Deno KV at ${config.database.path}`);
      }
    } else {
      // KV API not available - use fallback for development
      console.log("Deno KV not available. Using in-memory fallback store.");
      console.log("To use Deno KV, upgrade to Deno 1.32.4+ and run with --unstable-kv flag.");
      fallbackStore = new Map();
    }
  } catch (error) {
    console.error("Failed to initialize database:", error);
    // Create fallback in-memory store for development
    if (!config.isProduction) {
      console.log("Using in-memory fallback store for development.");
      fallbackStore = new Map();
    } else {
      throw new Error("Database initialization failed");
    }
  }
}

/**
 * Simple fallback implementation of KV store using in-memory Map
 */
class FallbackKv {
  private store: Map<string, unknown>;

  constructor(store: Map<string, unknown>) {
    this.store = store;
  }

  // Convert array key to string for storage
  private getKeyString(key: unknown[]): string {
    return JSON.stringify(key);
  }

  // Basic get implementation
  async get<T = unknown>(key: unknown[]): Promise<{ key: unknown[]; value: T | null; versionstamp: string | null }> {
    const keyStr = this.getKeyString(key);
    const value = this.store.get(keyStr);
    return {
      key,
      value: value === undefined ? null : value as T,
      versionstamp: value ? Date.now().toString() : null,
    };
  }

  // Basic set implementation
  async set(key: unknown[], value: unknown): Promise<{ ok: true; versionstamp: string }> {
    const keyStr = this.getKeyString(key);
    this.store.set(keyStr, value);
    return { ok: true, versionstamp: Date.now().toString() };
  }

  // Basic delete implementation
  async delete(key: unknown[]): Promise<void> {
    const keyStr = this.getKeyString(key);
    this.store.delete(keyStr);
  }

  // Get multiple values by keys
  async getMany<T = unknown>(keys: unknown[][]): Promise<Array<{ key: unknown[]; value: T | null; versionstamp: string | null }>> {
    return Promise.all(keys.map(key => this.get<T>(key)));
  }

  // Basic list implementation with prefix, start, end, and limit support
  async *list<T = unknown>(options?: { 
    prefix?: unknown[]; 
    start?: unknown[]; 
    end?: unknown[]; 
    limit?: number;
    reverse?: boolean;
  }): AsyncIterable<{ key: unknown[]; value: T; versionstamp: string }> {
    const prefix = options?.prefix ? this.getKeyString(options.prefix).slice(0, -1) : "";
    const start = options?.start ? this.getKeyString(options.start) : "";
    const end = options?.end ? this.getKeyString(options.end) : "\uffff";
    const limit = options?.limit ?? Number.MAX_SAFE_INTEGER;
    const reverse = options?.reverse ?? false;
    
    // Collect all matching keys
    const entries: Array<[string, unknown]> = [];
    for (const [keyStr, value] of this.store.entries()) {
      if ((prefix === "" || keyStr.startsWith(prefix)) && 
          keyStr >= start && 
          keyStr <= end) {
        entries.push([keyStr, value]);
      }
    }
    
    // Sort entries
    entries.sort((a, b) => {
      if (reverse) {
        return b[0].localeCompare(a[0]);
      }
      return a[0].localeCompare(b[0]);
    });
    
    // Apply limit and yield entries
    let count = 0;
    for (const [keyStr, value] of entries) {
      if (count >= limit) break;
      
      const key = JSON.parse(keyStr);
      yield {
        key,
        value: value as T,
        versionstamp: Date.now().toString(),
      };
      
      count++;
    }
  }

  // Basic atomic operations
  atomic() {
    const self = this;
    const operations: Array<{
      type: 'set' | 'delete' | 'check';
      key: unknown[];
      value?: unknown;
      versionstamp?: string | null;
    }> = [];
    
    return {
      set: (key: unknown[], value: unknown) => {
        operations.push({ type: 'set', key, value });
        return this;
      },
      delete: (key: unknown[]) => {
        operations.push({ type: 'delete', key });
        return this;
      },
      check: ({ key, versionstamp }: { key: unknown[]; versionstamp: string | null }) => {
        operations.push({ type: 'check', key, versionstamp });
        return this;
      },
      commit: async (): Promise<{ ok: boolean; versionstamp?: string }> => {
        // Simple check for any conflicts
        for (const op of operations) {
          if (op.type === 'check') {
            const result = await self.get(op.key);
            if (String(result.versionstamp) !== String(op.versionstamp)) {
              return { ok: false };
            }
          }
        }
        
        // Apply all operations
        for (const op of operations) {
          if (op.type === 'set') {
            await self.set(op.key, op.value);
          } else if (op.type === 'delete') {
            await self.delete(op.key);
          }
        }
        
        return { ok: true, versionstamp: Date.now().toString() };
      }
    };
  }
}

/**
 * Get a reference to the database
 */
export function getKv(): Deno.Kv | FallbackKv {
  if (kv) {
    return kv;
  }
  
  if (fallbackStore) {
    return new FallbackKv(fallbackStore);
  }
  
  throw new Error("Database not initialized. Call initDatabase() first.");
}

/**
 * Close the database connection
 * This should be called when shutting down the application
 */
export function closeDatabase(): void {
  kv = null;
  fallbackStore = null;
}