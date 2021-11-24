FROM node:16-alpine

WORKDIR /app

COPY ./src ./src
COPY ./package.json ./package.json
COPY ./package-lock.json ./package-lock.json

RUN npm ci

ENTRYPOINT ["npm", "start"]
