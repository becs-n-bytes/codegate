FROM node:22-slim

RUN npm install -g @anthropic-ai/claude-code codex aider

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY dist/ ./dist/

RUN useradd -m codegate
USER codegate

EXPOSE 3000

CMD ["node", "dist/main.js"]
