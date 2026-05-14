# --- Build Aşaması ---
FROM node:20-alpine AS builder

WORKDIR /app

# Build sırasında NODE_ENV=development olmalı (devDependencies gerekli)
ENV NODE_ENV=development

# Paket dosyalarını kopyala
COPY package.json package-lock.json* ./

# TÜM bağımlılıkları yükle (devDependencies dahil)
RUN npm install --include=dev

# Kaynak kodları kopyala
COPY . .

# 1. Vite önyüzünü derle
RUN npm run build

# 2. Server.ts'i JavaScript'e derle (tsx runtime derlemesi yerine)
RUN npx esbuild server.ts --bundle --platform=node --format=cjs --outfile=dist/server.cjs --external:express --external:firebase --external:firebase-admin --external:bcryptjs --external:web-push --external:dotenv --external:vite

# --- Prodüksiyon Aşaması ---
FROM node:20-alpine

WORKDIR /app

# Paket dosyalarını kopyala
COPY package.json package-lock.json* ./

# Sadece prodüksiyon bağımlılıklarını yükle
ENV NODE_ENV=production
RUN npm install --omit=dev

# Derlenmiş önyüzü ve sunucuyu kopyala
COPY --from=builder /app/dist ./dist

# Public dosyaları kopyala (PWA service worker, logolar vb.)
COPY --from=builder /app/public ./public

EXPOSE 8104

# Health check (node ile başlangıç çok daha hızlı)
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://localhost:8104/api/health || exit 1

# Sunucuyu node ile başlat (tsx yok, derleme yok, anında çalışır)
CMD ["node", "dist/server.cjs"]
