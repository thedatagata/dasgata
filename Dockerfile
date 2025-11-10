FROM denoland/deno:2.5.6

WORKDIR /app
COPY . .

# Cache dependencies
RUN deno cache --reload main.ts dev.ts

# Build with flag
ENV BUILD_PHASE=true
RUN deno task build
ENV BUILD_PHASE=

EXPOSE 8000
CMD ["deno", "run", "-A", "--unstable-kv", "main.ts"]