# ProxLedger – Abbild für Dashboard und Worker.
# Beide Dienste teilen sich dieses Abbild und unterscheiden sich nur im Startbefehl.

FROM node:24-alpine AS basis
WORKDIR /app
# openssl wird von Prisma benötigt, tini beendet Prozesse sauber.
RUN apk add --no-cache openssl tini

# ---------------------------------------------------------------- Abhängigkeiten
FROM basis AS abhaengigkeiten
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma7.config.ts ./
RUN npm ci --ignore-scripts

# ---------------------------------------------------------------- Bauen
FROM abhaengigkeiten AS bauen
COPY . .
RUN npx prisma generate \
 && npm run build \
 && npm run build:worker

# ---------------------------------------------------------------- Laufzeit
FROM basis AS laufzeit
ENV NODE_ENV=production
ENV PORT=3000
# Ohne diese Zeile nimmt Next den von Docker gesetzten HOSTNAME als Bindeadresse und lauscht
# nur auf der Container-IP. Die Zustandsprüfung über 127.0.0.1 schlägt dann immer fehl.
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S proxledger && adduser -S proxledger -u 1001 -G proxledger

# Next.js im Standalone-Modus bringt seine eigenen Abhängigkeiten mit.
COPY --from=bauen --chown=proxledger:proxledger /app/.next/standalone ./
COPY --from=bauen --chown=proxledger:proxledger /app/.next/static ./.next/static
COPY --from=bauen --chown=proxledger:proxledger /app/public ./public

# Agent-Skripte werden zur Laufzeit ausgeliefert.
COPY --from=bauen --chown=proxledger:proxledger /app/agent ./agent

# Worker als gebündelte Datei. Migrationen übernimmt der eigene Dienst „migrate“
# (Stufe „bauen“), damit dieses Abbild schlank bleibt und keine CLI mitschleppt.
COPY --from=bauen --chown=proxledger:proxledger /app/dist ./dist
COPY --chown=proxledger:proxledger deploy/start.sh ./start.sh

RUN mkdir -p /data/uploads && chown -R proxledger:proxledger /data
VOLUME ["/data"]
ENV UPLOAD_DIR=/data/uploads

USER proxledger
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["./start.sh", "web"]
