import os
import json
from http.server import HTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)

CATALOG_FILE = os.path.join(ROOT, "catalog.json")
PORT = int(os.environ.get("PORT", 8123))


class Handler(SimpleHTTPRequestHandler):
    def _is_local(self):
        return self.client_address[0] in ("127.0.0.1", "::1")

    def do_GET(self):
        if self.path == "/catalog":
            self._serve_catalog()
        elif self.path == "/mode":
            self._serve_mode()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == "/catalog":
            if not self._is_local():
                self.send_error(403, "Read-only from network")
                return
            self._save_catalog()
        else:
            self.send_error(404)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _serve_mode(self):
        payload = json.dumps({"readOnly": not self._is_local()}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self._cors()
        self.end_headers()
        self.wfile.write(payload)

    def _serve_catalog(self):
        if os.path.exists(CATALOG_FILE):
            with open(CATALOG_FILE, "r", encoding="utf-8") as f:
                data = f.read()
        else:
            data = "[]"
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self._cors()
        self.end_headers()
        self.wfile.write(data.encode("utf-8"))

    def _save_catalog(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        try:
            parsed = json.loads(body)
            with open(CATALOG_FILE, "w", encoding="utf-8") as f:
                json.dump(parsed, f, ensure_ascii=False, indent=2)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._cors()
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
        except Exception as e:
            self.send_error(400, str(e))

    def log_message(self, fmt, *args):
        pass  # suppress per-request noise


print(f"Tea catalog running on http://0.0.0.0:{PORT}")
print(f"  Local:   http://localhost:{PORT}")
import socket
try:
    hostname = socket.gethostname()
    lan_ip = socket.gethostbyname(hostname)
    print(f"  Network: http://{lan_ip}:{PORT}  ← share this with friends on the same WiFi")
except Exception:
    pass

HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
