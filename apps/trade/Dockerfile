# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/trade/package.json apps/trade/
COPY packages/ packages/

# Install dependencies for all workspaces
RUN pnpm install 

RUN pnpm --filter ./apps/trade add dotenv
# Copy source code for api and shared packa

# Copy source code for trade and shared packages
COPY apps/trade/ apps/trade/
COPY packages/ packages/

# Build the trade service
WORKDIR /app/apps/trade
RUN pnpm prisma:generate
RUN pnpm build

# Stage 2: Create the production image
FROM node:20-alpine AS runner

WORKDIR /app

# Copy only the necessary files from the builder stage
COPY --from=builder /app/apps/trade/node_modules ./node_modules
COPY --from=builder /app/apps/trade/dist ./dist
COPY --from=builder /app/apps/trade/package.json ./package.json
COPY --from=builder /app/apps/trade/prisma ./prisma
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages ./packages


# Set environment variables for production
ENV NODE_ENV production

# Command to run the Trade service
CMD ["node", "dist/server.js"]
