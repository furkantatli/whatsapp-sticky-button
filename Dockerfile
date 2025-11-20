FROM node:18-alpine

RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

# Copy package files first
COPY package.json package-lock.json* ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy all source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Debug: List build directory contents
RUN ls -la build/ && ls -la build/server/

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0

# Prune dev dependencies after build
RUN npm prune --production

CMD ["npm", "run", "docker-start"]
