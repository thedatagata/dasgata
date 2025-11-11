// routes/api/query/cache.ts
import { Handlers } from "$fresh/server.ts";

const kv = await Deno.openKv();

export const handler: Handlers = {
  // POST: Cache a new query
  async POST(req) {
    try {
      const { prompt, query, results, tableNames, queryMode, approved } = await req.json();
      
      const id = crypto.randomUUID();
      const cached = {
        id,
        prompt,
        query,
        results,
        timestamp: Date.now(),
        approved: approved || false,
        tableNames,
        queryMode
      };

      await kv.set(["query_cache", id], cached, {
        expireIn: 1000 * 60 * 60 * 24 * 7 // 7 days
      });

      console.log(`💾 Cached query: ${id}`);

      return new Response(JSON.stringify({ success: true, id }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },

  // GET: Find similar cached query (uses text similarity)
  async GET(req) {
    try {
      const url = new URL(req.url);
      const prompt = url.searchParams.get("prompt");
      const queryMode = url.searchParams.get("queryMode") as 'webllm' | 'motherduck' | null;
      const threshold = parseFloat(url.searchParams.get("threshold") || "0.5");

      if (!prompt) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "prompt parameter required" 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Get all cached queries
      const iter = kv.list({ prefix: ["query_cache"] });
      const queries: any[] = [];

      for await (const entry of iter) {
        const cached = entry.value as any;
        if (queryMode && cached.queryMode !== queryMode) continue;
        queries.push(cached);
      }

      // Simple text similarity (compare prompts)
      const findBest = (target: string, candidates: any[]) => {
        let best = null;
        let bestScore = threshold;
        
        for (const candidate of candidates) {
          const score = simpleTextSimilarity(target, candidate.prompt);
          if (score > bestScore) {
            bestScore = score;
            best = { ...candidate, similarity: score };
          }
        }
        return best;
      };

      const similar = findBest(prompt, queries);

      return new Response(JSON.stringify({ 
        success: true, 
        cached: similar 
      }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};

// Simple text similarity without dependencies
function simpleTextSimilarity(a: string, b: string): number {
  const tokensA = a.toLowerCase().split(/\s+/);
  const tokensB = b.toLowerCase().split(/\s+/);
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}
