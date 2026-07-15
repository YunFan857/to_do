#!/usr/bin/env python3
"""Local-only data service for 我的待办."""

import argparse
import json
import os
import tempfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DATA_FILE = Path.home() / "Library" / "Application Support" / "我的待办" / "data.json"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        if self.path.startswith("/api/"):
            super().log_message(fmt, *args)

    def _json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        if self.path != "/api/state":
            return self._json(404, {"error": "not found"})
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/state":
            if not DATA_FILE.exists():
                return self._json(200, {"version": 1, "todos": [], "exists": False})
            try:
                with DATA_FILE.open("r", encoding="utf-8") as fh:
                    data = json.load(fh)
                if not isinstance(data, dict) or not isinstance(data.get("todos"), list):
                    raise ValueError("invalid data file")
                return self._json(200, {"version": 1, "todos": data["todos"], "exists": True})
            except (OSError, ValueError, json.JSONDecodeError) as exc:
                return self._json(500, {"error": f"无法读取本地数据：{exc}"})
        if self.path != "/" and self.path != "/index.html":
            return self._json(404, {"error": "not found"})
        return super().do_GET()

    def do_PUT(self):
        if self.path != "/api/state":
            return self._json(404, {"error": "not found"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > 20 * 1024 * 1024:
                raise ValueError("data too large")
            data = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(data, dict) or not isinstance(data.get("todos"), list):
                raise ValueError("invalid state")
            DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
            fd, temp_name = tempfile.mkstemp(prefix="data.", suffix=".tmp", dir=DATA_FILE.parent)
            try:
                with os.fdopen(fd, "w", encoding="utf-8") as fh:
                    json.dump({"version": 1, "todos": data["todos"]}, fh, ensure_ascii=False, indent=2)
                    fh.write("\n")
                    fh.flush()
                    os.fsync(fh.fileno())
                os.replace(temp_name, DATA_FILE)
            finally:
                if os.path.exists(temp_name):
                    os.unlink(temp_name)
            return self._json(200, {"ok": True})
        except (OSError, ValueError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            return self._json(400, {"error": f"无法保存本地数据：{exc}"})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"我的待办 local server listening on http://127.0.0.1:{args.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
