# Multi-stage build
FROM node:23-alpine as builder

# Set working directory
WORKDIR /usr/src/app

# Copy package files first to leverage cache
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies using cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm install && cd frontend && npm install

# Copy source files
COPY frontend frontend
COPY backend backend

# Build frontend with normal build mode
RUN --mount=type=cache,target=/usr/src/app/node_modules/.cache \
    cd frontend && npx react-scripts build

# Production stage
FROM node:23-alpine as production

WORKDIR /usr/src/app

# Copy only production dependencies
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install --omit=dev

# Correctly copy frontend build to public directory
COPY --from=builder /usr/src/app/frontend/build /usr/src/app/public
COPY --from=builder /usr/src/app/backend backend

# Set environment variables
ENV NODE_ENV=production \
    PORT=3001

EXPOSE 3001

CMD ["npm", "start"]