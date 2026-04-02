from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import base64

app = Flask(__name__)
CORS(app)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"}), 200

@app.route('/api/generate', methods=['POST'])
def generate():
    try:
        data = request.json
        image = data.get('image')  # base64 encoded image
        prompt = data.get('prompt', '')
        items = data.get('items', '')
        
        # TODO: Integrate Hugging Face Inference API for ControlNet + Stable Diffusion
        # For MVP mockup, just return a success payload or mock images
        mock_response = {
            "status": "success",
            "images": [] # to be filled with generated base64 strings
        }
        
        return jsonify(mock_response), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
