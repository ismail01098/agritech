# Farmers First Hackathon Project

A farmer support web app with a polished frontend, login page, voice assistant, weather and soil APIs, and a Python/Flask backend.

## Features
- Responsive multi-page frontend with `index.html`, `about.html`, `market.html`, `assistant.html`, and `login.html`
- Voice/text assistant interface in `assistant.html`
- Aesthetic animated UI and blurred login background
- Login/register backend with SQLite user store
- Weather and soil API proxy through the Flask backend
- Backend served from `app.py`

## Setup
1. Create a Python environment.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the app:
   ```bash
   python app.py
   ```
4. Open http://localhost:5000 in a browser.

## Notes
- The SQLite database is created automatically under `data/users.db`.
- Login page forwards credentials to `/api/login` and `/api/register`.
- Weather and soil actions use backend API endpoints and Open-Meteo for live data.
