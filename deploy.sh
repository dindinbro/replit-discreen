#!/bin/bash
set -e
echo "==> Discreen - Deploiement VPS"

if [ ! -f ".env" ]; then
  if [ -f ".env.production" ]; then
    cp .env.production .env
    echo "[OK] .env copie depuis .env.production"
  else
    cp .env.example .env
    echo "[WARN] .env cree depuis .env.example — edite-le avec tes valeurs"
  fi
else
  echo "[INFO] .env existe deja, pas de modification"
fi

echo "==> Installation des dependances..."
npm install 2>/dev/null && echo "[OK] Dependances installees" || echo "[WARN] npm install echoue"

echo ""
echo "==> Pour lancer :"
echo "    npx tsx server/index.ts"
echo ""
echo "==> Avec pm2 :"
echo "    pm2 start 'npx tsx server/index.ts' --name discreen"
