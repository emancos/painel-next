# -------------------------------------------------------------
# Dockerfile para Painel de Chamados (Next.js 15 Standalone)
# -------------------------------------------------------------

# Estágio 1: Instalação de dependências
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Estágio 2: Build da aplicação Next.js
FROM node:24-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Garante que a pasta public e pastas necessárias sempre existam
RUN mkdir -p /app/public /app/scripts /app/drizzle

# Argumento e variável injetada pelo GitHub Actions para o bundle cliente
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Executa o build de produção (standalone)
RUN npm run build

# Estágio 3: Imagem final enxuta de produção (Runner)
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia arquivos estáticos públicos do builder com a propriedade do usuário nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Garante a existência e permissões de escrita na pasta de logos
RUN mkdir -p /app/public/logos && chown -R nextjs:nodejs /app/public

# Copia saída standalone e assets compilados
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copia scripts de migração e pastas drizzle para permitir execução no container
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
