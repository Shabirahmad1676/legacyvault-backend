# Backend Dockerfile (Express)
FROM node:20-alpine
WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
RUN npm ci --production --silent
COPY . .
EXPOSE 5000
ENV NODE_ENV=production
CMD ["node", "app.js"]
