#!/usr/bin/env python3
"""
The 60-Second Interrogation - Backend Server (Phase 3: Sarvam STT)
Serves static frontend and forwards user audio to Sarvam AI Speech-to-Text API.
"""

import os
import json
from http.server import HTTPServer, SimpleHTTPRequestHandler
import requests

PORT = 3000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SARVAM_STT_ENDPOINT = "https://api.sarvam.ai/speech-to-text"

def load_env():
    """Simple parser for .env file to avoid external dependencies."""
    env_file = os.path.join(BASE_DIR, '.env')
    if os.path.exists(env_file):
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    val = val.strip().strip('"').strip("'")
                    os.environ[key.strip()] = val

class InterrogationHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_POST(self):
        if self.path in ['/api/audio', '/api/transcribe']:
            self.handle_audio_transcription()
        else:
            self.send_error(404, "Endpoint not found")

    def handle_audio_transcription(self):
        try:
            # Re-read env in case user updated .env while server is running
            load_env()
            api_key = os.environ.get('SARVAM_API_KEY', '').strip()

            content_length = int(self.headers.get('Content-Length', 0))
            content_type = self.headers.get('Content-Type', 'audio/webm').split(';')[0].strip()

            if content_length == 0:
                self.send_json_response(400, {
                    "status": "error",
                    "message": "Empty audio payload received."
                })
                return

            audio_data = self.rfile.read(content_length)

            print("\n" + "="*55)
            print("🎙️  [BACKEND] AUDIO BLOB RECEIVED")
            print(f"📦 Content-Type: {content_type}")
            print(f"📊 Size        : {len(audio_data):,} bytes ({len(audio_data) / 1024:.2f} KB)")
            print("="*55)

            # Check if Sarvam API key is configured
            if not api_key or api_key == "your_sarvam_api_key_here":
                warning_msg = (
                    "SARVAM_API_KEY is not set! Please add your Sarvam API key to .env file "
                    "(SARVAM_API_KEY=your_key) and try again."
                )
                print(f"⚠️  [SARVAM STT CONFIG] {warning_msg}")
                self.send_json_response(400, {
                    "status": "error",
                    "error_type": "MISSING_API_KEY",
                    "message": warning_msg
                })
                return

            # Determine file extension based on MIME type
            ext = "webm"
            if "wav" in content_type:
                ext = "wav"
            elif "ogg" in content_type:
                ext = "ogg"
            elif "mp3" in content_type:
                ext = "mp3"

            # Prepare multipart request for Sarvam STT API
            files = {
                'file': (f'question_audio.{ext}', audio_data, content_type)
            }
            data = {
                'model': 'saaras:v4',
                'mode': 'transcribe'
            }
            headers = {
                'api-subscription-key': api_key
            }

            print(f"🚀 [SARVAM STT] Forwarding audio to {SARVAM_STT_ENDPOINT} (model: saaras:v4)...")
            
            response = requests.post(
                SARVAM_STT_ENDPOINT,
                headers=headers,
                files=files,
                data=data,
                timeout=25
            )

            print(f"📥 [SARVAM STT] Response HTTP Status: {response.status_code}")

            if response.status_code == 200:
                stt_result = response.json()
                transcript = stt_result.get('transcript', '').strip()
                detected_lang = stt_result.get('language_code', 'unknown')

                print("="*55)
                print("✅ [SARVAM STT SUCCESS]")
                print(f"📝 Transcript   : \"{transcript}\"")
                print(f"🌐 Language Code: {detected_lang}")
                print("="*55 + "\n")

                if not transcript:
                    transcript = "(Audio detected, but speech was unclear)"

                self.send_json_response(200, {
                    "status": "success",
                    "transcript": transcript,
                    "language_code": detected_lang
                })

            elif response.status_code == 400 and 'model' in response.text.lower():
                # Fallback to saaras:v3 if saaras:v4 isn't enabled for the account
                print("🔄 [SARVAM STT] Retrying with model saaras:v3...")
                data['model'] = 'saaras:v3'
                retry_resp = requests.post(
                    SARVAM_STT_ENDPOINT,
                    headers=headers,
                    files={'file': (f'question_audio.{ext}', audio_data, content_type)},
                    data=data,
                    timeout=25
                )
                if retry_resp.status_code == 200:
                    stt_result = retry_resp.json()
                    transcript = stt_result.get('transcript', '').strip()
                    self.send_json_response(200, {
                        "status": "success",
                        "transcript": transcript,
                        "language_code": stt_result.get('language_code', 'unknown')
                    })
                    return
                else:
                    self.send_json_response(retry_resp.status_code, {
                        "status": "error",
                        "message": f"Sarvam STT error: {retry_resp.text}"
                    })

            else:
                print(f"❌ [SARVAM STT ERROR] Status {response.status_code}: {response.text}")
                self.send_json_response(response.status_code, {
                    "status": "error",
                    "message": f"Sarvam STT failed: {response.text}"
                })

        except requests.exceptions.Timeout:
            print("❌ [SARVAM STT ERROR] Request timed out.")
            self.send_json_response(504, {
                "status": "error",
                "message": "Sarvam STT request timed out."
            })
        except Exception as e:
            print(f"❌ [BACKEND ERROR] Unexpected error: {e}")
            self.send_json_response(500, {
                "status": "error",
                "message": f"Internal server error: {str(e)}"
            })

    def send_json_response(self, status_code, data):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, api-subscription-key')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, api-subscription-key')
        self.end_headers()

def run_server():
    load_env()
    key = os.environ.get('SARVAM_API_KEY', '').strip()
    key_status = "CONFIGURED (Found in .env)" if key and key != "your_sarvam_api_key_here" else "NOT SET (Waiting for .env)"

    server_address = ('', PORT)
    httpd = HTTPServer(server_address, InterrogationHandler)
    print("="*60)
    print(f"🚀 The 60-Second Interrogation Server running at http://localhost:{PORT}")
    print(f"🔑 Sarvam AI API Key Status: {key_status}")
    print(f"🎙️  STT Forwarding Endpoint  : POST http://localhost:{PORT}/api/audio")
    print("="*60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped gracefully.")

if __name__ == '__main__':
    run_server()
