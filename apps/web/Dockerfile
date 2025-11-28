# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/ packages/

# Install dependencies for all workspaces
RUN pnpm install 

RUN pnpm --filter ./apps/trade add dotenv
# Copy source code for api and shared packa

# Copy source code for web and shared packages
COPY apps/web/ apps/web/
COPY packages/ packages/

# Build the web service
WORKDIR /app/apps/web
ENV NEXT_PUBLIC_SUPABASE_URL="https://example.supabase.co"
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY="dummy-key"
RUN pnpm build

# Stage 2: Create the production image
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment variables for production
ENV NODE_ENV production

# The Next.js standalone output is highly optimized.
# It places all necessary files, including a trimmed-down node_modules, into a .next/standalone directory.
# We copy this directly.
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/.next/static ./.next/static


# Expose the port the Next.js app runs on (default 4000 as per README)
EXPOSE 4000

# Command to run the Next.js application
CMD ["node", "server.js"]
