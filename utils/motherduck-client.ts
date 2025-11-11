import { MDConnection } from "npm:@motherduck/wasm-client@0.6.6";

export async function createMotherDuckClient(token: string) {
  const connection = MDConnection.create({
    mdToken: token,
    // Configure IndexedDB persistence
    duckDbConfig: {
      path: 'md.db', // Persist to IndexedDB as 'md.db'
    }
  });
  
  await connection.isInitialized();
  console.log("MotherDuck WASM client initialized successfully");
  
  return connection;
}

export async function queryToJSON(client: any, sql: string) {
  const result = await client.evaluateQuery(sql);
  if (result.type === 'materialized') {
    return result.data.toRows();
  }
  throw new Error('Unexpected streaming result');
}