# Backend Dockerfile (Express)
FROM node:20-alpine
WORKDIR /usr/src/app
COPY package.json package-lock.json* ./

# Install ALL dependencies (including sequelize-cli devDependencies for migrations)
RUN npm ci --silent

COPY . .
EXPOSE 5000
ENV NODE_ENV=production

# Run migrations on container boot, then start the server
CMD ["sh", "-c", "npx sequelize-cli db:migrate && node app.js"]