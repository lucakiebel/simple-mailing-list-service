FROM node:22.19.0-alpine

WORKDIR /app

COPY package.json .
COPY package-lock.json .

RUN npm ci

COPY . .

EXPOSE 3000
RUN npm run build
CMD ["npm", "run", "start:prod"]