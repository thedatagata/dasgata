#!/usr/bin/env -S deno run -A --watch=static/,routes/

// Add this line to load environment variables
import "$std/dotenv/load.ts";

import dev from "$fresh/dev.ts";
import config from "./fresh.config.ts";

await dev(import.meta.url, "./main.ts", config);