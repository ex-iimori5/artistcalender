FROM node:20-slim

WORKDIR /app

# Playwright の依存ライブラリと日本語フォント
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

# 依存パッケージのインストール
COPY package*.json ./
RUN npm ci

# Playwright の Chromium をダウンロード（with-deps でシステム依存も一緒に入れる）
RUN npx playwright install chromium --with-deps

# ソースコピー & ビルド
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080
CMD ["npm", "start"]
