# =============================================================================
# MMIT Timetable Backend - Production Dockerfile
# Supports Node.js 20 + Python 3 + Google OR-Tools CP-SAT Solver
# Compatible with Render, Railway, Fly.io, and standard Docker VPS
# =============================================================================

FROM node:20-bookworm-slim

# Install Python 3 and pip (required for Google OR-Tools CP-SAT solver)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Google OR-Tools for Python
RUN pip3 install --no-cache-dir ortools --break-system-packages

WORKDIR /app

# Copy dependency specifications first for Docker layer caching
COPY package*.json ./

# Install npm dependencies
RUN npm install

# Copy application source code and Prisma configuration
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Default environment variables
ENV NODE_ENV=production
ENV PORT=5050

# Expose backend port
EXPOSE 5050

# Run auto-seed check and launch backend API server
CMD ["npm", "start"]
