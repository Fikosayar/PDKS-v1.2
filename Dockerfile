# --- Build Aşaması ---
FROM node:20-alpine AS builder

WORKDIR /app

# Build sırasında NODE_ENV=development olmalı (devDependencies gerekli)
ENV NODE_ENV=development

# Paket dosyalarını kopyala
COPY package.json package-lock.json* ./

# TÜM bağımlılıkları yükle (devDependencies dahil - vite, tailwind, vite-plugin-pwa vs.)
RUN npm install --include=dev

# Kaynak kodları kopyala
COPY . .

# Vite önyüzünü derle
RUN npm run build

# --- Prodüksiyon Aşaması ---
FROM node:20-alpine

WORKDIR /app

# Paket dosyalarını kopyala
COPY package.json package-lock.json* ./

# Sadece prodüksiyon bağımlılıklarını yükle
ENV NODE_ENV=production
RUN npm install --omit=dev

# tsx gerekli (server.ts çalıştırmak için)
RUN npm install -g tsx

# Derlenmiş önyüzü kopyala
COPY --from=builder /app/dist ./dist

# Arkayüz dosyalarını kopyala
COPY --from=builder /app/server.ts ./

# Public dosyaları kopyala (PWA service worker, logolar vb.)
COPY --from=builder /app/public ./public

# Firestore kurallarını kopyala (referans için)
COPY --from=builder /app/firestore.rules ./

EXPOSE 8104

# Health check (daha toleranslı — sunucu başlangıcı için yeterli süre)
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5 \
  CMD wget -qO- http://localhost:8104/api/health || exit 1

# Sunucuyu başlat
CMD ["tsx", "server.ts"]
