FROM node:24-bookworm-slim AS assemble
WORKDIR /build
COPY missao-circular/ ./baseline/
COPY release/ ./release/
COPY tools/unpack.mjs ./tools/unpack.mjs
RUN node tools/unpack.mjs /build/baseline /out
COPY hotfix/ ./hotfix/
COPY tools/patch-view.mjs ./tools/patch-view.mjs
RUN node tools/patch-view.mjs /out /build/hotfix
RUN node /build/hotfix/ending-apply.mjs /out

FROM node:24-bookworm-slim
WORKDIR /app
COPY --from=assemble /out/ ./
RUN mkdir -p /app/private && chmod 700 /app/private
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["node", "server/entry.mjs"]
