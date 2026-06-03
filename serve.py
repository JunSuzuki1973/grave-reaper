"""
Grave Reaper 開発サーバー。
ブラウザがJS/画像を古いままキャッシュしないよう、no-cache ヘッダーを付与する。
使い方:  python serve.py   →  http://localhost:8080
"""
import http.server
import socketserver
import os
import functools

PORT = 8080
# スクリプトのある場所を配信ルートにする（起動時のCWDに依存しない）
ROOT = os.path.dirname(os.path.abspath(__file__))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # 毎回サーバーから最新を取得させる
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # 静かに動作


if __name__ == "__main__":
    handler = functools.partial(NoCacheHandler, directory=ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"Grave Reaper dev server: http://localhost:{PORT}  (Ctrl+C で停止)")
        httpd.serve_forever()
