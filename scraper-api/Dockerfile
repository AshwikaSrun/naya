FROM node:20-bullseye-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
  libglib2.0-0 \
  libnss3 \
  libatk-bridge2.0-0 \
  libgtk-3-0 \
  libx11-6 \
  libxcomposite1 \
  libxrandr2 \
  libxdamage1 \
  libxfixes3 \
  libgbm1 \
  libasound2 \
  libatk1.0-0 \
  libpangocairo-1.0-0 \
  libpango-1.0-0 \
  libcairo2 \
  libdrm2 \
  libxkbcommon0 \
  libxext6 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev && npx playwright install chromium

COPY . .

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "start"]
