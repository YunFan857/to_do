#!/bin/bash
cd "$(dirname "$0")"
exec python3 local_server.py --port 8765
