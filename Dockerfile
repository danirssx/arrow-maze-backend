FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
# Prisma schema + config are needed for the `postinstall` (prisma generate) hook.
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HUSKY=0
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
# The generated Prisma Client lives in node_modules/.prisma (re-exported by
# @prisma/client). It is produced by `prisma generate`, which the production
# install skips, so copy it from the build stage.
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/framework/server.js"]
