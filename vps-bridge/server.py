#!/usr/bin/env python3
"""
Discreen VPS Bridge — Flask API
Searches local SQLite FTS5 databases and enforces origin whitelist.

Usage:
  pip install flask boto3
  export BRIDGE_SECRET="your-secret-here"
  export ALLOWED_ORIGIN="https://your-discreen-site.com"
  export DATA_DIR="./data"        # folder containing .db files
  export PORT=5050
  python server.py

Endpoints:
  GET  /health          Health check + list of loaded databases
  POST /search          Full-text search across all databases
"""

import os
import re
import glob
import sqlite3
import hashlib
import hmac
import time
from functools import wraps
from flask import Flask, request, jsonify, abort

app = Flask(__name__)

BRIDGE_SECRET = os.environ.get("BRIDGE_SECRET", "")
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "")
DATA_DIR = os.environ.get("DATA_DIR", "./data")
PORT = int(os.environ.get("PORT", 5050))

loaded_dbs = {}


def discover_databases():
    """Scan DATA_DIR for .db files and verify they have an FTS5 'records' table."""
    global loaded_dbs
    loaded_dbs = {}

    if not os.path.isdir(DATA_DIR):
        print(f"[bridge] DATA_DIR not found: {DATA_DIR}")
        return

    for db_path in sorted(glob.glob(os.path.join(DATA_DIR, "*.db"))):
        filename = os.path.basename(db_path)
        key = filename.replace(".db", "")

        try:
            conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
            conn.execute("PRAGMA query_only = ON")
            cursor = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='records'"
            )
            if cursor.fetchone():
                conn.execute("SELECT 1 FROM records LIMIT 1")
                loaded_dbs[key] = db_path
                print(f"[bridge] Loaded: {filename}")
            else:
                print(f"[bridge] Skipped (no 'records' table): {filename}")
                conn.close()
        except Exception as e:
            print(f"[bridge] Failed to load {filename}: {e}")


def get_connection(key):
    """Open a read-only connection to a database."""
    db_path = loaded_dbs.get(key)
    if not db_path:
        return None
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA query_only = ON")
    return conn


def check_origin(f):
    """Middleware: reject requests not from the allowed origin."""
    @wraps(f)
    def decorated(*args, **kwargs):
        origin = request.headers.get("Origin", "")
        referer = request.headers.get("Referer", "")

        if ALLOWED_ORIGIN:
            origin_ok = origin and origin.rstrip("/") == ALLOWED_ORIGIN.rstrip("/")
            referer_ok = referer and referer.startswith(ALLOWED_ORIGIN.rstrip("/"))

            if not origin_ok and not referer_ok:
                is_server = request.headers.get("X-Bridge-Secret") == BRIDGE_SECRET and BRIDGE_SECRET
                if not is_server:
                    abort(403, description="Origin not allowed")

        return f(*args, **kwargs)
    return decorated


def check_secret(f):
    """Middleware: validate X-Bridge-Secret header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if BRIDGE_SECRET:
            provided = request.headers.get("X-Bridge-Secret", "")
            if not hmac.compare_digest(provided, BRIDGE_SECRET):
                abort(401, description="Invalid bridge secret")
        return f(*args, **kwargs)
    return decorated


def sanitize_fts_query(value):
    """Escape a user query for FTS5 MATCH."""
    cleaned = value.strip()
    cleaned = cleaned.replace('"', '""')
    return f'"{cleaned}"'


def parse_line(content, source=""):
    """Parse a raw database line into structured fields."""
    result = {"_source": source, "_raw": content}

    separators = [":", ";", "|", "\t", ","]
    chosen_sep = None
    for sep in separators:
        if sep in content:
            chosen_sep = sep
            break

    if not chosen_sep:
        if re.search(r'[\w.+-]+@[\w.-]+', content):
            result["email"] = content.strip()
        else:
            result["identifiant"] = content.strip()
        return result

    parts = content.split(chosen_sep)

    for part in parts:
        part = part.strip()
        if not part:
            continue

        if re.search(r'^[\w.+-]+@[\w.-]+\.\w{2,}$', part):
            result["email"] = part
        elif re.search(r'^\+?\d[\d\s\-.()]{6,}$', part):
            result["telephone"] = part
        elif re.search(r'^\d{1,3}(\.\d{1,3}){3}$', part):
            result["ip"] = part
        elif re.search(r'^https?://', part):
            result["url"] = part
        elif "identifiant" not in result and not re.search(r'\s', part) and len(part) < 60:
            result["identifiant"] = part
        elif "password" not in result and "identifiant" in result:
            result["password"] = part

    return result


def search_one_db(key, criteria, limit):
    """Search a single database for matching records."""
    conn = get_connection(key)
    if not conn:
        return []

    try:
        primary = criteria[0]
        fts_query = sanitize_fts_query(primary["value"])
        query = "SELECT source, content FROM records WHERE records MATCH ? ORDER BY rank LIMIT ?"
        rows = conn.execute(query, (fts_query, limit * 3)).fetchall()

        results = []
        for row in rows:
            parsed = parse_line(row["content"], row["source"])
            match = True
            for c in criteria:
                val = c["value"].lower()
                field = c.get("field", "")
                if field and field in parsed:
                    if val not in str(parsed[field]).lower():
                        match = False
                        break
                elif val not in row["content"].lower():
                    match = False
                    break

            if match:
                results.append(parsed)
                if len(results) >= limit:
                    break

        return results
    except Exception as e:
        print(f"[bridge] Error searching {key}: {e}")
        return []
    finally:
        conn.close()


@app.after_request
def add_cors_headers(response):
    """Add CORS headers to every response."""
    if ALLOWED_ORIGIN:
        response.headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN
    else:
        response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Bridge-Secret"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "databases": len(loaded_dbs),
        "names": list(loaded_dbs.keys()),
    })


@app.route("/search", methods=["POST", "OPTIONS"])
@check_secret
@check_origin
def search():
    if request.method == "OPTIONS":
        return "", 204

    data = request.get_json(silent=True)
    if not data:
        abort(400, description="JSON body required")

    criteria = data.get("criteria", [])
    limit = min(max(int(data.get("limit", 20)), 1), 200)
    offset = max(int(data.get("offset", 0)), 0)

    if not criteria or not isinstance(criteria, list):
        abort(400, description="'criteria' array required")

    filled = [c for c in criteria if c.get("value", "").strip()]
    if not filled:
        return jsonify({"results": [], "total": 0})

    all_results = []
    for key in loaded_dbs:
        if len(all_results) >= limit:
            break
        remaining = limit - len(all_results)
        results = search_one_db(key, filled, remaining)
        all_results.extend(results)

    return jsonify({
        "results": all_results[:limit],
        "total": len(all_results),
    })


@app.route("/sources", methods=["GET"])
@check_secret
def sources():
    all_sources = {}
    for key in loaded_dbs:
        conn = get_connection(key)
        if not conn:
            continue
        try:
            rows = conn.execute(
                "SELECT source, COUNT(*) as c FROM records GROUP BY source ORDER BY c DESC LIMIT 50"
            ).fetchall()
            all_sources[key] = [{"source": r["source"], "count": r["c"]} for r in rows]
        except Exception as e:
            all_sources[key] = {"error": str(e)}
        finally:
            conn.close()

    return jsonify(all_sources)


if __name__ == "__main__":
    print(f"[bridge] Data directory: {DATA_DIR}")
    print(f"[bridge] Allowed origin: {ALLOWED_ORIGIN or '* (all)'}")
    print(f"[bridge] Secret configured: {'yes' if BRIDGE_SECRET else 'no'}")

    discover_databases()

    print(f"\n[bridge] Starting on port {PORT}...")
    app.run(host="0.0.0.0", port=PORT, debug=False)
