#!/bin/sh
# The data volume may be empty or freshly mounted: make the folders the
# studio's symlinks point at, then start it.
set -e
mkdir -p /data/content /data/media /data/out /data/studio
exec "$@"
