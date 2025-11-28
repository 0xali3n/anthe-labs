# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm
RUN pnpm install --prod

# Copy root package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy specific app's package.json
COPY apps/api/package.json apps/api/

# Copy shared packages and their package.json files
COPY packages/ packages/

# Install dependencies for all workspaces
RUN pnpm install --frozen-lockfile

# Copy source code for api and shared packages
COPY apps/api/ apps/api/
COPY packages/ packages/

# Build the api service
WORKDIR /app/apps/api
RUN pnpm exec prisma generate
RUN pnpm build

# Stage 2: Create the production image
FROM node:20-alpine AS runner

WORKDIR /app

# The Next.js standalone output is highly optimized.
# It places all necessary files, including a trimmed-down node_modules, into a .next/standalone directory.
# We copy this directly.
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages ./packages


# Expose the port the API runs on (default 4001 as per README)
EXPOSE 4001

# Set environment variables for production
ENV NODE_ENV production

# Command to run the API service
WORKDIR /app/apps/api
CMD ["node", "dist/main.js"]
