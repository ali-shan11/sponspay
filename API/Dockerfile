FROM mirror.gcr.io/library/node:20-alpine AS base

RUN apk update && apk add curl

RUN npm i -g @nestjs/cli

RUN mkdir /api

WORKDIR /api

FROM base AS development

CMD npm install && npm run start:debug

FROM base AS build

COPY . .

RUN npm ci

RUN npm run build

FROM mirror.gcr.io/library/node:20-alpine AS production

WORKDIR /api

COPY package*.json .

RUN npm ci --only=production

COPY --from=build /api/dist dist

# Set ownership of the entire /api directory to the node user
RUN chown -R node:node /api

# Switch to non-root user for security
USER node

CMD ["node", "dist/src/main.js"]
