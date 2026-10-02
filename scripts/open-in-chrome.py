"""Start the local game server and open it in Google Chrome on macOS."""

import functools
import http.server
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))

try:
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 5173), handler)
except OSError:
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)

url = f"http://127.0.0.1:{server.server_port}/"
print(f"차라리 내가 키운다: {url}", flush=True)
try:
    subprocess.run(["open", "-a", "Google Chrome", url], check=True)
except (OSError, subprocess.CalledProcessError):
    print(f"Chrome에서 직접 주소를 여세요: {url}", flush=True)

print("이 창을 열어 두세요. 종료하려면 Control-C를 누르세요.", flush=True)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
