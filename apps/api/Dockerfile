# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/ packages/

# Install dependencies
RUN pnpm install

# Copy application code
COPY apps/api/ apps/api/
COPY packages/ packages/

# Build
WORKDIR /app/apps/api
RUN pnpm exec prisma generate
RUN pnpm build

# Stage 2: Production image
FROM node:20-alpine AS runner

WORKDIR /app
RUN npm install -g pnpm

# Copy only package manifests (for prod install)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/ packages/

# Install production dependencies
RUN pnpm install --prod

# Copy build output
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Expose port
EXPOSE 4001

# Run API
WORKDIR /app/apps/api
CMD ["node", "dist/main.js"]
