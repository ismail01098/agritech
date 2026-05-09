import hashlib
import importlib
import os
import io
from urllib.parse import quote
import requests
import base64

OPENCV_AVAILABLE = False
FACE_RECOGNITION_AVAILABLE = False
cv2 = None
np = None
face_recognition = None

try:
    cv2 = importlib.import_module('cv2')
    np = importlib.import_module('numpy')
    OPENCV_AVAILABLE = True
except ImportError:
    cv2 = None
    np = None

try:
    face_recognition = importlib.import_module('face_recognition')
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    face_recognition = None

if not FACE_RECOGNITION_AVAILABLE:
    print("Warning: Advanced face recognition not available. Using basic face detection if available.")

from flask import Flask, jsonify, request, send_from_directory
from pycore.database import create_user, find_user, find_user_by_face, ensure_database

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontnd')

app = Flask(
    __name__,
    static_folder=FRONTEND_DIR,
    static_url_path=''
)

ensure_database()


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()


def detect_face_basic(image_data):
    """Basic face detection using OpenCV Haar cascades"""
    if not OPENCV_AVAILABLE or np is None or cv2 is None:
        return False

    try:
        # Decode base64 image
        image_bytes = base64.b64decode(image_data.split(',')[1])
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return False

        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Load Haar cascade
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

        # Detect faces
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)

        return len(faces) > 0
    except Exception:
        return False


@app.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'login.html')


@app.route('/<path:path>')
def static_proxy(path):
    return send_from_directory(FRONTEND_DIR, path)


@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    if not username or not password:
        return jsonify(success=False, message='Username and password are required.')

    user = find_user(username)
    if not user:
        return jsonify(success=False, message='Invalid username or password.')

    _, _, password_hash, _ = user
    if hash_password(password) != password_hash:
        return jsonify(success=False, message='Invalid username or password.')

    return jsonify(success=True, message='Login successful.')


@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    face_image = data.get('face_image')  # base64 string
    if not username or not password:
        return jsonify(success=False, message='Username and password are required.')

    password_hash = hash_password(password)
    face_encoding = None

    if face_image:
        if FACE_RECOGNITION_AVAILABLE:
            try:
                image_data = base64.b64decode(face_image.split(',')[1])
                image = face_recognition.load_image_file(io.BytesIO(image_data))
                encodings = face_recognition.face_encodings(image)
                if encodings:
                    face_encoding = encodings[0]
            except Exception:
                return jsonify(success=False, message='Face processing failed.')
        elif OPENCV_AVAILABLE:
            # Basic face detection - just store that face was provided
            if detect_face_basic(face_image):
                face_encoding = "basic_face_detected"  # Simple marker
            else:
                return jsonify(success=False, message='No face detected in image.')
        else:
            return jsonify(success=False, message='Face recognition not available. Use text registration only.')

    created = create_user(username, password_hash, face_encoding)
    if not created:
        return jsonify(success=False, message='Username already exists.')

    return jsonify(success=True, message='Registration successful. You can now login.')


@app.route('/api/face_login', methods=['POST'])
def api_face_login():
    if not OPENCV_AVAILABLE and not FACE_RECOGNITION_AVAILABLE:
        return jsonify(success=False, message='Face recognition not available.')

    data = request.get_json() or {}
    face_image = data.get('face_image')
    if not face_image:
        return jsonify(success=False, message='Face image is required.')

    if FACE_RECOGNITION_AVAILABLE:
        try:
            image_data = base64.b64decode(face_image.split(',')[1])
            image = face_recognition.load_image_file(io.BytesIO(image_data))
            encodings = face_recognition.face_encodings(image)
            if not encodings:
                return jsonify(success=False, message='No face detected.')

            username = find_user_by_face(encodings[0])
            if username:
                return jsonify(success=True, message='Face login successful.', username=username)
            else:
                return jsonify(success=False, message='Face not recognized.')
        except (ValueError, IndexError, AttributeError, OSError):
            return jsonify(success=False, message='Face processing failed.')
    elif OPENCV_AVAILABLE:
        # Basic face detection - just check if face is present
        if detect_face_basic(face_image):
            # For basic version, just return success for any registered user with face data
            # In a real app, you'd want better matching
            return jsonify(success=True, message='Face detected! Login successful.', username='demo_user')
        else:
            return jsonify(success=False, message='No face detected.')

    return jsonify(success=False, message='Face processing failed.')


@app.route('/api/weather', methods=['POST'])
def api_weather():
    data = request.get_json() or {}
    location = data.get('location', '').strip()
    if not location:
        return jsonify(success=False, message='Location is required.')

    geo_url = f'https://geocoding-api.open-meteo.com/v1/search?name={quote(location)}&count=1&language=en&format=json'
    geo = requests.get(geo_url, timeout=10).json()
    results = geo.get('results') or []
    if not results:
        return jsonify(success=False, message='Location not found.')

    place = results[0]
    lat = place['latitude']
    lon = place['longitude']
    forecast_url = f'https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto'
    forecast = requests.get(forecast_url, timeout=10).json()
    return jsonify(success=True, location=f"{place['name']}, {place['country']}", forecast=forecast)


@app.route('/api/soil', methods=['POST'])
def api_soil():
    data = request.get_json() or {}
    location = data.get('location', '').strip()
    if not location:
        return jsonify(success=False, message='Location is required.')

    geo_url = f'https://geocoding-api.open-meteo.com/v1/search?name={quote(location)}&count=1&language=en&format=json'
    geo = requests.get(geo_url, timeout=10).json()
    results = geo.get('results') or []
    if not results:
        return jsonify(success=False, message='Location not found.')

    place = results[0]
    lat = place['latitude']
    lon = place['longitude']
    soil_url = f'https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=soil_moisture_0_1cm&timezone=auto'
    soil = requests.get(soil_url, timeout=10).json()
    return jsonify(success=True, location=f"{place['name']}, {place['country']}", soil=soil)


@app.route('/api/product_comparison', methods=['POST'])
def api_product_comparison():
    data = request.get_json() or {}
    product = data.get('product', '').strip().lower()
    if not product:
        return jsonify(success=False, message='Product name is required.')

    price_catalog = {
        'tomato': {'name': 'Tomato', 'price': 28, 'market': 'All India', 'image': 'assets/market.svg'},
        'onion': {'name': 'Onion', 'price': 32, 'market': 'All India', 'image': 'assets/market.svg'},
        'rice': {'name': 'Rice', 'price': 45, 'market': 'All India', 'image': 'assets/market.svg'},
        'wheat': {'name': 'Wheat', 'price': 26, 'market': 'All India', 'image': 'assets/market.svg'},
        'potato': {'name': 'Potato', 'price': 18, 'market': 'All India', 'image': 'assets/market.svg'},
        'banana': {'name': 'Banana', 'price': 35, 'market': 'All India', 'image': 'assets/market.svg'},
        'apple': {'name': 'Apple', 'price': 80, 'market': 'All India', 'image': 'assets/market.svg'},
        'mango': {'name': 'Mango', 'price': 95, 'market': 'All India', 'image': 'assets/market.svg'}
    }

    if product not in price_catalog:
        return jsonify(success=False, message='Product not found. Try Tomato, Onion, Rice, Wheat, Potato, Banana, Apple, or Mango.')

    return jsonify(success=True, **price_catalog[product])


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
