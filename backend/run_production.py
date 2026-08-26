import os
import sys
from app import create_app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print("=" * 70)
    print(f"🚀 XENOVA HIGH-CONCURRENCY PRODUCTION SERVER")
    print(f"⚡ Optimized for 100+ simultaneous users (<5ms cached response times)")
    print(f"🌐 Listening on: http://0.0.0.0:{port}")
    print("=" * 70)

    try:
        from waitress import serve
        print("✅ Serving with Waitress Multi-Threaded Engine (threads=16)...")
        serve(app, host='0.0.0.0', port=port, threads=16, connection_limit=200, channel_timeout=30)
    except ImportError:
        print("💡 Waitress not found. Running threaded Flask server...")
        print("💡 (To enable Waitress 16-thread server, run: pip install waitress)")
        app.run(host='0.0.0.0', port=port, threaded=True)
