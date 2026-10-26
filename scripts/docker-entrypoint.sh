#!/bin/sh
set -e

# Garante a existência e permissões de escrita nas pastas persistentes de upload montadas via volume
mkdir -p /app/public/logos /app/public/avatars
chown -R nextjs:nodejs /app/public/logos /app/public/avatars
chmod -R 775 /app/public/logos /app/public/avatars

# Transfere a execução para o usuário não-root seguro 'nextjs' (UID 1001)
exec su-exec nextjs "$@"
