#!/usr/bin/env python3
"""
PUMA AE II EP — Emergency Procedures Trainer
Localhost server.

Usage:
    python server.py
"""

import http.server
import socketserver
import webbrowser
import threading
import os
import sys

HOST = 'localhost'
PORT = 8080

# Serve from the directory containing this script
os.chdir(os.path.dirname(os.path.abspath(__file__)))


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    """Static file handler that suppresses request logging."""

    def log_message(self, fmt, *args):
        pass  # Keep terminal clean

    def log_error(self, fmt, *args):
        pass


def open_browser():
    import time
    time.sleep(0.6)
    webbrowser.open(f'http://{HOST}:{PORT}')


def main():
    threading.Thread(target=open_browser, daemon=True).start()

    print()
    print('  PUMA AE II EP -- Emergency Procedures Trainer')
    print('  ' + '-' * 47)
    print(f'  http://{HOST}:{PORT}')
    print('  Press Ctrl+C to stop')
    print()

    with socketserver.TCPServer((HOST, PORT), QuietHandler) as server:
        server.allow_reuse_address = True
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print('\n  Server stopped.')
            sys.exit(0)


if __name__ == '__main__':
    main()
