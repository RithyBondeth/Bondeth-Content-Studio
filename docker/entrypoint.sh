#!/bin/sh
# The data volume may be empty, freshly mounted, or owned by root (Railway
# mounts volumes that way): make the folders the studio's symlinks point at,
# give them to the "node" user, and run the studio as that user.
set -e
mkdir -p /data/content /data/media /data/out /data/studio
if [ "$(id -u)" = "0" ]; then
  chown node:node /data /data/content /data/media /data/out /data/studio
  exec setpriv --reuid=node --regid=node --init-groups "$@"
fi
exec "$@"
