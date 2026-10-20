"""Local preview server that behaves like GitHub Pages: any page that doesn't exist shows 404.html.
Usage, from the repo folder: python tools/serve.py [port]   (default 8000)"""
import functools, http.server, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")   # always check for edits, so local testing never shows an old page
        super().end_headers()

    def send_error(self, code, message=None, explain=None):
        page = ROOT / "404.html"
        if code != 404 or not page.exists():
            return super().send_error(code, message, explain)
        body = page.read_bytes()
        self.send_response(404)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
print(f"Serving {ROOT} at http://localhost:{port}/ (missing pages show 404.html)")
http.server.ThreadingHTTPServer(("", port), functools.partial(Handler, directory=str(ROOT))).serve_forever()
