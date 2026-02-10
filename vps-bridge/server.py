#!/usr/bin/env python3
"""
Discreen VPS Bridge — Flask API (R2 Streaming)
Searches raw text files directly on Cloudflare R2 (no local storage needed).

Usage:
  pip install flask boto3 gunicorn
  export BRIDGE_SECRET="your-secret-here"
  export ALLOWED_ORIGIN="https://your-discreen-site.com"
  export S3_ENDPOINT="https://xxx.r2.cloudflarestorage.com"
  export S3_BUCKET="your-bucket"
  export S3_ACCESS_KEY_ID="your-key"
  export S3_SECRET_ACCESS_KEY="your-secret"
  export R2_DATA_PREFIX="data-files/"
  export PORT=5050
  python server.py
"""

import os
import re
import io
import time
import hmac
import threading
from functools import wraps
from concurrent.futures import ThreadPoolExecutor, as_completed
from flask import Flask, request, jsonify, abort

import boto3
from botocore.config import Config as BotoConfig

app = Flask(__name__)

BRIDGE_SECRET = os.environ.get("BRIDGE_SECRET", "")
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "")
PORT = int(os.environ.get("PORT", 5050))

S3_ENDPOINT = os.environ.get("S3_ENDPOINT", "")
S3_BUCKET = os.environ.get("S3_BUCKET", "")
S3_ACCESS_KEY_ID = os.environ.get("S3_ACCESS_KEY_ID", "")
S3_SECRET_ACCESS_KEY = os.environ.get("S3_SECRET_ACCESS_KEY", "")
R2_DATA_PREFIX = os.environ.get("R2_DATA_PREFIX", "data-files/")

SUPPORTED_EXT = [".txt", ".csv", ".log", ".json", ".tsv", ".sql", ".dat"]
PARALLEL_STREAMS = 10
SEARCH_TIMEOUT_S = 60
FILE_LIST_CACHE_TTL = 300

BLACKLISTED_SOURCES = {"Pass'Sport.csv", "Pass'Sport", "PassSport.csv", "PassSport"}

cached_file_list = []
file_list_cache_time = 0
file_list_lock = threading.Lock()

s3_client = None


def get_s3_client():
    global s3_client
    if s3_client:
        return s3_client

    if not S3_BUCKET or not S3_ACCESS_KEY_ID or not S3_SECRET_ACCESS_KEY:
        print("[bridge] R2 credentials missing!")
        return None

    kwargs = {
        "region_name": "auto",
        "aws_access_key_id": S3_ACCESS_KEY_ID,
        "aws_secret_access_key": S3_SECRET_ACCESS_KEY,
        "config": BotoConfig(
            retries={"max_attempts": 2, "mode": "standard"},
            connect_timeout=10,
            read_timeout=30,
        ),
    }
    if S3_ENDPOINT:
        kwargs["endpoint_url"] = S3_ENDPOINT

    s3_client = boto3.client("s3", **kwargs)
    return s3_client


def list_data_files():
    global cached_file_list, file_list_cache_time

    with file_list_lock:
        if cached_file_list and (time.time() - file_list_cache_time) < FILE_LIST_CACHE_TTL:
            return cached_file_list

    client = get_s3_client()
    if not client:
        return []

    files = []
    continuation_token = None

    try:
        while True:
            params = {"Bucket": S3_BUCKET, "Prefix": R2_DATA_PREFIX}
            if continuation_token:
                params["ContinuationToken"] = continuation_token

            response = client.list_objects_v2(**params)

            for obj in response.get("Contents", []):
                key = obj.get("Key", "")
                size = obj.get("Size", 0)
                if not key or not size:
                    continue

                ext_idx = key.rfind(".")
                if ext_idx >= 0:
                    ext = key[ext_idx:].lower()
                    if ext in SUPPORTED_EXT:
                        files.append({"key": key, "size": size})

            if response.get("IsTruncated"):
                continuation_token = response.get("NextContinuationToken")
            else:
                break

        with file_list_lock:
            cached_file_list = files
            file_list_cache_time = time.time()

        print(f"[bridge] Cached {len(files)} data files from R2")
    except Exception as e:
        print(f"[bridge] Error listing R2 files: {e}")

    return files


def get_filename(key):
    return key.split("/")[-1]


def parse_line(content, source=""):
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
            if "email" not in result:
                result["email"] = part
        elif re.search(r'^\+?\d[\d\s\-.()]{6,}$', part):
            if "telephone" not in result:
                result["telephone"] = part
        elif re.search(r'^\d{1,3}(\.\d{1,3}){3}$', part):
            if "ip" not in result:
                result["ip"] = part
        elif re.search(r'^https?://', part):
            if "url" not in result:
                result["url"] = part
        elif "identifiant" not in result and not re.search(r'\s', part) and len(part) < 60:
            result["identifiant"] = part
        elif "password" not in result and "identifiant" in result:
            result["password"] = part

    return result


def filter_results(parsed_list, criteria):
    filtered = []
    for item in parsed_list:
        match = True
        for c in criteria:
            val = c["value"].lower()
            field = c.get("field", "")
            raw = str(item.get("_raw", "")).lower()

            if field and field in item:
                if val not in str(item[field]).lower():
                    match = False
                    break
            elif val not in raw:
                match = False
                break

        if match:
            filtered.append(item)
    return filtered


def search_one_file(file_info, search_values, criteria, max_results, cancel_event):
    """Stream and search a single file from R2."""
    results = []
    filename = get_filename(file_info["key"])

    if filename in BLACKLISTED_SOURCES or filename.rsplit(".", 1)[0] in BLACKLISTED_SOURCES:
        return results

    client = get_s3_client()
    if not client:
        return results

    try:
        response = client.get_object(Bucket=S3_BUCKET, Key=file_info["key"])
        body = response["Body"]

        raw_matches = []

        for raw_line in body.iter_lines():
            if cancel_event.is_set():
                break

            try:
                line = raw_line.decode("utf-8", errors="replace").strip()
            except Exception:
                continue

            if not line or len(line) < 3:
                continue

            line_lower = line.lower()
            if any(val in line_lower for val in search_values):
                raw_matches.append({"content": line, "source": filename})
                if len(raw_matches) >= max_results * 5:
                    break

        if raw_matches:
            parsed = [parse_line(r["content"], r["source"]) for r in raw_matches]
            filtered = filter_results(parsed, criteria)
            results.extend(filtered[:max_results])

        body.close()
    except Exception as e:
        if not cancel_event.is_set():
            print(f"[bridge] Error reading {file_info['key']}: {e}")

    return results


def check_origin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        origin = request.headers.get("Origin", "")
        referer = request.headers.get("Referer", "")

        if ALLOWED_ORIGIN:
            origin_ok = origin and origin.rstrip("/") == ALLOWED_ORIGIN.rstrip("/")
            referer_ok = referer and referer.startswith(ALLOWED_ORIGIN.rstrip("/"))

            if not origin_ok and not referer_ok:
                is_server = BRIDGE_SECRET and request.headers.get("X-Bridge-Secret") == BRIDGE_SECRET
                if not is_server:
                    abort(403, description="Origin not allowed")

        return f(*args, **kwargs)
    return decorated


def check_secret(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if BRIDGE_SECRET:
            provided = request.headers.get("X-Bridge-Secret", "")
            if not hmac.compare_digest(provided, BRIDGE_SECRET):
                abort(401, description="Invalid bridge secret")
        return f(*args, **kwargs)
    return decorated


@app.after_request
def add_cors_headers(response):
    if ALLOWED_ORIGIN:
        response.headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN
    else:
        response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Bridge-Secret"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@app.route("/health", methods=["GET"])
def health():
    files = list_data_files()
    return jsonify({
        "status": "ok",
        "mode": "r2-streaming",
        "files": len(files),
        "bucket": S3_BUCKET,
        "prefix": R2_DATA_PREFIX,
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

    search_values = [c["value"].strip().lower() for c in filled]

    files = list_data_files()
    if not files:
        return jsonify({"results": [], "total": 0, "error": "No data files found in R2"})

    print(f"[bridge] Searching {len(files)} R2 files for {len(filled)} criteria")
    start_time = time.time()

    all_results = []
    needed = limit + offset
    cancel_event = threading.Event()
    partial = False

    def timeout_watchdog():
        nonlocal partial
        time.sleep(SEARCH_TIMEOUT_S)
        if not cancel_event.is_set():
            cancel_event.set()
            partial = True
            print(f"[bridge] Search timeout after {SEARCH_TIMEOUT_S}s")

    timer_thread = threading.Thread(target=timeout_watchdog, daemon=True)
    timer_thread.start()

    try:
        with ThreadPoolExecutor(max_workers=PARALLEL_STREAMS) as executor:
            for i in range(0, len(files), PARALLEL_STREAMS):
                if len(all_results) >= needed or cancel_event.is_set():
                    break

                batch = files[i:i + PARALLEL_STREAMS]
                remaining = needed - len(all_results)
                per_file = max(remaining // len(batch), 10)

                futures = {
                    executor.submit(
                        search_one_file, f, search_values, filled, per_file, cancel_event
                    ): f for f in batch
                }

                for future in as_completed(futures):
                    try:
                        file_results = future.result(timeout=SEARCH_TIMEOUT_S)
                        all_results.extend(file_results)
                        if len(all_results) >= needed:
                            cancel_event.set()
                            break
                    except Exception as e:
                        print(f"[bridge] File search error: {e}")

                progress = min(i + PARALLEL_STREAMS, len(files))
                if progress % 50 == 0 or progress >= len(files):
                    print(f"[bridge] Progress: {progress}/{len(files)} files, {len(all_results)} results")
    finally:
        cancel_event.set()

    elapsed = time.time() - start_time
    print(f"[bridge] Done in {elapsed:.1f}s — {len(all_results)} results, partial: {partial}")

    sliced = all_results[offset:offset + limit]

    return jsonify({
        "results": sliced,
        "total": len(all_results),
        "partial": partial,
    })


@app.route("/files", methods=["GET"])
@check_secret
def list_files():
    files = list_data_files()
    return jsonify({
        "count": len(files),
        "files": [{"name": get_filename(f["key"]), "size_mb": round(f["size"] / 1024 / 1024, 2)} for f in files],
    })


if __name__ == "__main__":
    print(f"[bridge] Mode: R2 Streaming (no local storage)")
    print(f"[bridge] Bucket: {S3_BUCKET}")
    print(f"[bridge] Prefix: {R2_DATA_PREFIX}")
    print(f"[bridge] Allowed origin: {ALLOWED_ORIGIN or '* (all)'}")
    print(f"[bridge] Secret configured: {'yes' if BRIDGE_SECRET else 'no'}")
    print(f"[bridge] Parallel streams: {PARALLEL_STREAMS}")
    print(f"[bridge] Timeout: {SEARCH_TIMEOUT_S}s")

    files = list_data_files()
    print(f"[bridge] Found {len(files)} searchable files on R2")

    print(f"\n[bridge] Starting on port {PORT}...")
    app.run(host="0.0.0.0", port=PORT, debug=False)
