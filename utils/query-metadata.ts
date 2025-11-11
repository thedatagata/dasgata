// utils/query-metadata.ts
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

export interface TableMetadata {
  tableName: string;
  location: 'memory' | 'motherduck';
  database?: string; // 'my_db' for motherduck
  schema: string;
  columns: ColumnInfo[];
  isStreaming: boolean;
  description?: string;
  rowCount?: number;
  lastUpdated: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  description?: string;
  nullable?: boolean;
  distinctCount?: number;
  sampleValues?: any[];
}

export interface QueryCache {
  query: string;
  results: any[];
  timestamp: number;
  approved?: boolean;
  executionTime?: number;
  tableName?: string;
}

const kv = await Deno.openKv();

// Hash function for query caching
function hashQuery(query: string): string {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, ' ');
  const hash = crypto.subtle.digestSync(
    "SHA-256",
    new TextEncoder().encode(normalized)
  );
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

// ==================== TABLE REGISTRY ====================

export async function registerTable(metadata: TableMetadata) {
  await kv.set(["tables", metadata.tableName], metadata);
  console.log(`✅ Registered table: ${metadata.tableName} (${metadata.location})`);
}

export async function getTableMetadata(tableName: string): Promise<TableMetadata | null> {
  const entry = await kv.get<TableMetadata>(["tables", tableName]);
  return entry.value;
}

export async function getAllTables(): Promise<TableMetadata[]> {
  const tables: TableMetadata[] = [];
  const iter = kv.list<TableMetadata>({ prefix: ["tables"] });
  
  for await (const entry of iter) {
    tables.push(entry.value);
  }
  
  return tables;
}

export async function deleteTable(tableName: string) {
  await kv.delete(["tables", tableName]);
  console.log(`🗑️ Deleted table metadata: ${tableName}`);
}

// ==================== QUERY CACHE ====================

export async function cacheQuery(
  query: string,
  results: any[],
  metadata?: { executionTime?: number; tableName?: string }
) {
  const queryHash = hashQuery(query);
  const cacheEntry: QueryCache = {
    query: query.trim(),
    results,
    timestamp: Date.now(),
    executionTime: metadata?.executionTime,
    tableName: metadata?.tableName,
  };
  
  // Cache with 1 hour TTL
  await kv.set(
    ["query_cache", queryHash],
    cacheEntry,
    { expireIn: 1000 * 60 * 60 }
  );
  
  console.log(`💾 Cached query: ${queryHash}`);
}

export async function getCachedQuery(query: string): Promise<QueryCache | null> {
  const queryHash = hashQuery(query);
  const entry = await kv.get<QueryCache>(["query_cache", queryHash]);
  
  if (entry.value) {
    console.log(`✨ Cache hit: ${queryHash}`);
  }
  
  return entry.value;
}

// ==================== APPROVED QUERIES ====================

export async function approveQuery(queryHash: string, userId: string) {
  // Get from cache
  const cached = await kv.get<QueryCache>(["query_cache", queryHash]);
  
  if (!cached.value) {
    throw new Error("Query not found in cache");
  }
  
  // Mark as approved and store permanently
  const approvedEntry: QueryCache = {
    ...cached.value,
    approved: true,
  };
  
  await kv.set(
    ["approved_queries", queryHash],
    approvedEntry
  );
  
  // Track who approved it
  await kv.set(
    ["user_approvals", userId, queryHash],
    { timestamp: Date.now() }
  );
  
  console.log(`✅ Approved query: ${queryHash} by ${userId}`);
}

export async function getApprovedQueries(limit = 20): Promise<QueryCache[]> {
  const queries: QueryCache[] = [];
  const iter = kv.list<QueryCache>({ prefix: ["approved_queries"] });
  
  for await (const entry of iter) {
    queries.push(entry.value);
    if (queries.length >= limit) break;
  }
  
  return queries;
}

export async function getUserApprovedQueries(userId: string): Promise<string[]> {
  const hashes: string[] = [];
  const iter = kv.list({ prefix: ["user_approvals", userId] });
  
  for await (const entry of iter) {
    const queryHash = entry.key[2] as string;
    hashes.push(queryHash);
  }
  
  return hashes;
}

// ==================== QUERY ROUTING ====================

export async function getQueryConnection(tableNames: string[]): Promise<{
  location: 'memory' | 'motherduck';
  database?: string;
}> {
  // Get metadata for first table to determine connection
  if (tableNames.length === 0) {
    return { location: 'memory' };
  }
  
  const tableName = tableNames[0];
  const metadata = await getTableMetadata(tableName);
  
  if (!metadata) {
    console.warn(`⚠️ No metadata for table: ${tableName}, defaulting to memory`);
    return { location: 'memory' };
  }
  
  return {
    location: metadata.location,
    database: metadata.database,
  };
}

// ==================== HELPERS ====================

export function getQueryHash(query: string): string {
  return hashQuery(query);
}

export async function clearCache() {
  const iter = kv.list({ prefix: ["query_cache"] });
  let count = 0;
  
  for await (const entry of iter) {
    await kv.delete(entry.key);
    count++;
  }
  
  console.log(`🧹 Cleared ${count} cached queries`);
}

export async function getStats() {
  const [tables, cached, approved] = await Promise.all([
    getAllTables(),
    (async () => {
      const items = [];
      for await (const _ of kv.list({ prefix: ["query_cache"] })) {
        items.push(_);
      }
      return items.length;
    })(),
    (async () => {
      const items = [];
      for await (const _ of kv.list({ prefix: ["approved_queries"] })) {
        items.push(_);
      }
      return items.length;
    })(),
  ]);
  
  return {
    registeredTables: tables.length,
    cachedQueries: cached,
    approvedQueries: approved,
    tables: tables.map(t => ({
      name: t.tableName,
      location: t.location,
      database: t.database,
      columns: t.columns.length,
    })),
  };
}
