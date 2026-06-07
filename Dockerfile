# Build and run a KAIROS agent. Defaults to the example agent (Atlas).
# Build:  docker build -t kairos-agent .
# Run:    docker run --env-file agents/example/.env -p 3000:3000 kairos-agent
FROM node:20-slim

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy the whole workspace (node_modules/dist are excluded via .dockerignore),
# then install from the frozen lockfile and build every package.
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build

ENV NODE_ENV=production
EXPOSE 3000

# Point AGENT_DIR at another agent to run it instead, e.g.
#   docker run -e AGENT_DIR=agents/oracle ...
ENV AGENT_DIR=agents/example
CMD ["sh", "-c", "cd $AGENT_DIR && pnpm start"]
