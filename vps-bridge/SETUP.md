# Discreen VPS Bridge — Setup

## Installation

```bash
cd vps-bridge
pip install -r requirements.txt
```

## Configuration

Variables d'environnement à définir :

```bash
export BRIDGE_SECRET="ton-secret-partage"
export ALLOWED_ORIGIN="https://ton-site-discreen.com"
export DATA_DIR="/chemin/vers/tes/databases"
export PORT=5050
```

- `BRIDGE_SECRET` : secret partagé entre le site et le VPS (doit être identique à `VPS_BRIDGE_SECRET` sur Replit)
- `ALLOWED_ORIGIN` : URL de ton site Discreen (seules les requêtes venant de cette origine seront acceptées)
- `DATA_DIR` : dossier contenant tes fichiers `.db` SQLite FTS5
- `PORT` : port d'écoute (défaut : 5050)

## Lancement

### Mode développement

```bash
python server.py
```

### Mode production (avec Gunicorn)

```bash
gunicorn -w 4 -b 0.0.0.0:5050 server:app
```

## Connexion avec Discreen (Replit)

Sur Replit, configure ces variables :

- `VPS_SEARCH_URL` = `http://ton-vps-ip:5050`
- `VPS_BRIDGE_SECRET` = même valeur que `BRIDGE_SECRET` sur le VPS

## Endpoints

| Méthode | Route      | Description                       |
|---------|------------|-----------------------------------|
| GET     | `/health`  | Status + liste des bases chargées |
| POST    | `/search`  | Recherche full-text               |
| GET     | `/sources` | Liste des sources indexées        |

## Sécurité

- Whitelist d'origine : seul `ALLOWED_ORIGIN` peut appeler l'API
- Header `X-Bridge-Secret` requis sur `/search` et `/sources`
- Bases ouvertes en lecture seule (`mode=ro`)
