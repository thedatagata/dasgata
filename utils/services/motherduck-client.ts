import { MDConnection } from "npm:@motherduck/wasm-client@0.6.6";

export async function createMotherDuckClient(token: string) {
  const connection = MDConnection.create({
    mdToken: token,
    duckDbConfig: {
      path: "md.db",
    },
  });

  await connection.isInitialized();

  // Set default database
  await connection.evaluateQuery("USE my_db;");

  console.log("MotherDuck WASM client initialized successfully");

  return connection;
}

export async function queryToJSON(client: any, sql: string) {
  const result = await client.evaluateQuery(sql);
  if (result.type === "materialized") {
    return result.data.toRows();
  }
  throw new Error("Unexpected streaming result");
}
