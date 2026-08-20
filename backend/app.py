import os
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config

# Import Blueprints
from routes.payments import payments_bp
from routes.registrations import registrations_bp
from routes.colleges import colleges_bp
from routes.teams import teams_bp
from routes.tournaments import tournaments_bp
from routes.auth import auth_bp
from routes.notifications import notifications_bp
from routes.applications import applications_bp

def create_app():
    app = Flask(__name__)
    app.url_map.strict_slashes = False
    
    # Enable CORS for Next.js / Vite React frontend
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register API Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(payments_bp, url_prefix='/api/payments')
    app.register_blueprint(registrations_bp, url_prefix='/api/registrations')
    app.register_blueprint(colleges_bp, url_prefix='/api/colleges')
    app.register_blueprint(teams_bp, url_prefix='/api/teams')
    app.register_blueprint(tournaments_bp, url_prefix='/api/tournaments')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(applications_bp, url_prefix='/api/applications')

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'service': 'Phoenix Esports Flask API',
            'version': '1.0.0'
        }), 200

    return app

app = create_app()

if __name__ == '__main__':
    print(f"🚀 Starting High-Performance Flask Server on port {Config.PORT}...")
    app.run(host='0.0.0.0', port=Config.PORT, debug=False, threaded=True)
