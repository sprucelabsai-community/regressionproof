FROM node:22-bullseye-slim AS build

WORKDIR /app

COPY package.json lerna.json tsconfig.base.json ./
COPY packages ./packages

RUN corepack enable
RUN yarn install --non-interactive
RUN yarn workspace @regressionproof/api build.tsc
RUN yarn workspace @regressionproof/api build.resolve-paths

FROM node:22-bullseye-slim

WORKDIR /app

COPY --from=build /app/packages/api/build ./build
COPY --from=build /app/packages/api/package.json ./package.json

RUN npm install --omit=dev

ENV NODE_ENV=production

CMD ["node", "build/serve.js"]
