FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Production stage - lightweight Express static server
FROM node:20-alpine

WORKDIR /app

# Only install express for the static server (not all app dependencies)
RUN npm init -y && npm install express@4.18.2

COPY server.js ./
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "server.js"]
