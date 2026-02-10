# Discreen VPS Bridge — Setup (R2 Streaming)

## Installation

```bash
cd vps-bridge
pip install -r requirements.txt
```

## Configuration

Variables d'environnement :

```bash
export BRIDGE_SECRET="ton-secret-partage"
export ALLOWED_ORIGIN="https://ton-site-discreen.com"
export S3_ENDPOINT="https://xxx.r2.cloudflarestorage.com"
export S3_BUCKET="ton-bucket"
export S3_ACCESS_KEY_ID="ta-cle"
export S3_SECRET_ACCESS_KEY="ton-secret"
export R2_DATA_PREFIX="data-files/"
export PORT=5050
```

- `BRIDGE_SECRET` : secret partagé (identique à `VPS_BRIDGE_SECRET` sur Replit)
- `ALLOWED_ORIGIN` : URL de ton site Discreen (whitelist)
- `S3_*` : credentials Cloudflare R2
- `R2_DATA_PREFIX` : préfixe des fichiers data sur R2 (défaut: `data-files/`)
- `PORT` : port d'écoute (défaut : 5050)

## Lancement

### Dev

```bash
python server.py
```

### Production (Gunicorn)

```bash
gunicorn -w 4 -b 0.0.0.0:5050 --timeout 120 server:app
```

## Connexion avec Discreen (Replit)

Sur Replit, configure :

- `VPS_SEARCH_URL` = `http://ton-vps-ip:5050`
- `VPS_BRIDGE_SECRET` = même valeur que `BRIDGE_SECRET`

## Endpoints

| Méthode | Route      | Description                              |
|---------|------------|------------------------------------------|
| GET     | `/health`  | Status + nombre de fichiers R2           |
| POST    | `/search`  | Recherche streaming dans les fichiers R2 |
| GET     | `/files`   | Liste des fichiers disponibles sur R2    |

## Fonctionnement

L'API ne stocke rien en local. Elle :
1. Liste les fichiers texte sur R2 (cache 5 min)
2. Stream chaque fichier ligne par ligne
3. Cherche les correspondances en parallèle (10 fichiers simultanés)
4. Parse et filtre les résultats
5. Timeout automatique à 60s avec résultats partiels

## Sécurité

- Whitelist d'origine (`ALLOWED_ORIGIN`)
- Header `X-Bridge-Secret` requis
- Aucun fichier stocké localement
