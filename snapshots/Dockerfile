# The Linux environment the visual snapshots are rendered in, locally
# (`npm run snapshots:docker`) and in CI, so both produce identical pixels.
# Build from the repository root: docker build -f snapshots/Dockerfile .
FROM node:22-bookworm-slim

# Libraries Chrome Headless Shell needs, plus the emoji font. Text uses the
# fonts bundled in public/fonts/; DejaVu is only a fallback for symbols they
# lack.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates libnss3 libdbus-1-3 libatk1.0-0 libgbm1 libasound2 \
    libxrandr2 libxkbcommon0 libxfixes3 libxcomposite1 libxdamage1 \
    libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 \
    fonts-noto-color-emoji fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
# Dependencies and the browser live in the image; the source is mounted at
# /app when the container runs.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund && npx remotion browser ensure
