# ---------- Stage 1: build the frontend ----------
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: production API + static frontend ----------
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app/backend
COPY backend/package.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY backend/ ./
COPY --from=frontend /app/frontend/dist /app/frontend/dist

EXPOSE 5000
USER node
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1
CMD ["node", "server.js"]
