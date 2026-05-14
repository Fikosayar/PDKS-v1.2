# --- Build Aşaması ---
FROM node:20-alpine AS builder

WORKDIR /app

# Paket dosyalarını kopyala
COPY package.json package-lock.json* ./

# Tüm bağımlılıkları yükle (build için gerekli)
RUN npm install

# Kaynak kodları kopyala
COPY . .

# .env dosyasını kontrol et (build sırasında VITE_ değişkenleri gerekli)
# Coolify'da environment variables olarak da ayarlanabilir

# Vite önyüzünü derle
RUN npm run build

# --- Prodüksiyon Aşaması ---
FROM node:20-alpine

WORKDIR /app

# Paket dosyalarını kopyala
COPY package.json package-lock.json* ./

# Sadece prodüksiyon bağımlılıklarını yükle
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

ENV NODE_ENV=production
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Sunucuyu başlat
CMD ["tsx", "server.ts"]
