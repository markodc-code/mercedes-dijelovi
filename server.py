"""Mercedes dijelovi - lokalno pokretanje. Pokreni: python server.py

Posluzuje mapu web/ na http://127.0.0.1:8770 i otvara preglednik.
Podaci (auti, dijelovi, fotke) cuvaju se u pregledniku (IndexedDB).
"""
import functools
import os
import sys
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = 8770
WEB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    srv = ThreadingHTTPServer(("0.0.0.0", PORT), functools.partial(Handler, directory=WEB))
    url = f"http://127.0.0.1:{PORT}/"
    print("Mercedes dijelovi radi na", url, "(zatvori prozor za kraj)")
    if "--no-browser" not in sys.argv:
        webbrowser.open(url)
    srv.serve_forever()


if __name__ == "__main__":
    main()
