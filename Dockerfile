# The studio on a server: the web app plus everything rendering needs.
#
#   docker compose up -d --build
#
# Projects, voice-overs, renders, and saved settings live in one volume at
# /data, so rebuilding or replacing the container keeps them. See the
# "Running on a server" section of the README.
FROM node:22-bookworm-slim

# Libraries Chrome Headless Shell needs (remotion.dev/docs/miscellaneous/linux-dependencies),
# plus fonts for symbols and emoji the bundled fonts lack.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates libnss3 libdbus-1-3 libatk1.0-0 libgbm1 libasound2 \
    libxrandr2 libxkbcommon0 libxfixes3 libxcomposite1 libxdamage1 \
    libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 \
    fonts-noto-color-emoji fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# All dependencies, dev ones included: renders run through tsx.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund && npx remotion browser ensure

COPY . .
RUN npx next build

# Point the folders the studio writes to at the data volume.
RUN mkdir -p /data public \
  && rm -rf content public/content out .studio \
  && ln -s /data/content content \
  && ln -s /data/media public/content \
  && ln -s /data/out out \
  && ln -s /data/studio .studio \
  && chown -R node:node /data .next

ENV NODE_ENV=production \
  PORT=3100 \
  HOSTNAME=0.0.0.0
USER node
VOLUME /data
EXPOSE 3100

ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["npx", "next", "start"]
