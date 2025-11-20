FROM node:18-alpine

RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0


COPY package.json package-lock.json* ./

# 1. Install ALL dependencies (including dev) to allow building
RUN npm ci

COPY . .

# 2. Build the app
RUN npm run build

# 3. Remove dev dependencies to keep the image small (optional but recommended)
RUN npm prune --production

CMD ["npm", "run", "docker-start"]
