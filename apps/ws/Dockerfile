# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm
RUN pnpm install --prod

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/ws/package.json apps/ws/
COPY packages/ packages/

# Install dependencies for all workspaces
RUN pnpm install --frozen-lockfile

# Copy source code for ws and shared packages
COPY apps/ws/ apps/ws/
COPY packages/ packages/

# Build the ws service
WORKDIR /app/apps/ws
RUN pnpm build

# Stage 2: Create the production image
FROM node:20-alpine AS runner

WORKDIR /app

# Copy only the necessary files from the builder stage
COPY --from=builder /app/apps/ws/node_modules ./node_modules
COPY --from=builder /app/apps/ws/dist ./dist
COPY --from=builder /app/apps/ws/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages ./packages


# Set environment variables for production
ENV NODE_ENV production

# Command to run the WebSocket service
CMD ["node", "dist/server.js"]
