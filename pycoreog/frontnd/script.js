const voiceBtn = document.querySelector('#voiceBtn');
const stopBtn = document.querySelector('#stopBtn');
const sendBtn = document.querySelector('#sendBtn');
const textInput = document.querySelector('#textInput');
const chatLog = document.querySelector('#chatLog');
const statusText = document.querySelector('#statusText');
const locationInput = document.querySelector('#locationInput');
const weatherBtn = document.querySelector('#weatherBtn');
const soilBtn = document.querySelector('#soilBtn');
const weatherOutput = document.querySelector('#weatherOutput');
const soilOutput = document.querySelector('#soilOutput');
const apiLog = document.querySelector('#apiLog');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let listening = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.addEventListener('result', event => {
        const transcript = event.results[0][0].transcript;
        statusText.textContent = 'Heard: ' + transcript;
        appendMessage('You', transcript);
        handleQuery(transcript);
    });

    recognition.addEventListener('end', () => {
        listening = false;
        voiceBtn.textContent = 'Start Voice';
        if (statusText.textContent.includes('Listening')) {
            statusText.textContent = 'Ready to listen.';
        }
    });

    recognition.addEventListener('error', event => {
        listening = false;
        statusText.textContent = 'Voice error: ' + event.error;
        voiceBtn.textContent = 'Start Voice';
    });
} else {
    statusText.textContent = 'Voice recognition is not supported in this browser.';
}

function appendMessage(label, text) {
    chatLog.value += `${label}: ${text}\n`;
    chatLog.scrollTop = chatLog.scrollHeight;
}

function speak(text) {
    if (!('speechSynthesis' in window)) {
        return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

function generateResponse(query) {
    const normalized = query.toLowerCase();
    if (normalized.includes('middlemen') || normalized.includes('market') || normalized.includes('price')) {
        return 'To help farmers remove middlemen, we provide direct market guidance and transparent pricing advice right on this page.';
    }
    if (normalized.includes('weather')) {
        return 'Enter your city or village and press Get Weather. The tool will provide a short forecast for farming decisions.';
    }
    if (normalized.includes('soil')) {
        return 'Type your location and press Check Soil to get soil moisture status and crop support tips.';
    }
    if (normalized.includes('help')) {
        return 'Use voice or text to ask about farming, weather, soil, or middleman removal. You can also use the API cards to fetch weather and soil details.';
    }
    if (normalized.includes('hello') || normalized.includes('hi')) {
        return 'Hello farmer! Tell me how I can help with a weather update, soil check, or market tip.';
    }
    return 'This farmer support assistant can answer farming questions, show weather forecasts, and check soil health for your location.';
}

function handleQuery(query) {
    if (!query || !query.trim()) {
        return;
    }
    const message = query.trim();
    appendMessage('You', message);
    const response = generateResponse(message);
    appendMessage('Assistant', response);
    speak(response);
    statusText.textContent = 'Answered your question.';
}

function startListening() {
    if (!recognition) {
        statusText.textContent = 'Voice recognition not available.';
        return;
    }
    if (listening) {
        return;
    }
    listening = true;
    voiceBtn.textContent = 'Listening...';
    statusText.textContent = 'Listening for your voice...';
    recognition.start();
}

function stopListening() {
    if (!recognition || !listening) {
        statusText.textContent = 'Voice is not active.';
        return;
    }
    recognition.stop();
    listening = false;
    voiceBtn.textContent = 'Start Voice';
    statusText.textContent = 'Stopped listening.';
}

async function postJson(path, data) {
    const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return response.json();
}

function formatWeatherData(daily) {
    const code = daily.weathercode[0];
    const weatherMap = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Fog',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        61: 'Light rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        80: 'Rain showers',
        95: 'Thunderstorm'
    };
    const description = weatherMap[code] || 'Mixed conditions';
    return `Forecast: ${description}. High ${daily.temperature_2m_max[0]}°C, low ${daily.temperature_2m_min[0]}°C.`;
}

async function loadWeather(location) {
    const data = await postJson('/api/weather', { location });
    if (!data.success) {
        throw new Error(data.message || 'Weather data unavailable.');
    }
    weatherOutput.textContent = `Location: ${data.location}\n${formatWeatherData(data.forecast.daily)}`;
    apiLog.textContent = `Weather data updated for ${data.location}.`;
}

async function loadSoil(location) {
    const data = await postJson('/api/soil', { location });
    if (!data.success) {
        throw new Error(data.message || 'Soil data unavailable.');
    }
    const soilValues = data.soil.hourly.soil_moisture_0_1cm;
    if (!soilValues || soilValues.length === 0) {
        throw new Error('Soil data unavailable.');
    }
    const moisture = soilValues[0];
    const status = moisture < 0.08 ? 'Dry soil - consider irrigation.' : moisture < 0.18 ? 'Healthy soil moisture.' : 'High moisture - good for sowing if stable.';
    soilOutput.textContent = `Location: ${data.location}\nSoil moisture: ${moisture.toFixed(3)} m3/m3\nStatus: ${status}`;
    apiLog.textContent = `Soil data updated for ${data.location}.`;
}

weatherBtn.addEventListener('click', async () => {
    const location = locationInput.value.trim();
    if (!location) {
        apiLog.textContent = 'Please enter a location first.';
        return;
    }
    apiLog.textContent = 'Fetching weather data...';
    try {
        await loadWeather(location);
    } catch (error) {
        apiLog.textContent = error.message;
        weatherOutput.textContent = 'Unable to load weather.';
    }
});

soilBtn.addEventListener('click', async () => {
    const location = locationInput.value.trim();
    if (!location) {
        apiLog.textContent = 'Please enter a location first.';
        return;
    }
    apiLog.textContent = 'Fetching soil data...';
    try {
        await loadSoil(location);
    } catch (error) {
        apiLog.textContent = error.message;
        soilOutput.textContent = 'Unable to load soil data.';
    }
});

voiceBtn.addEventListener('click', startListening);
stopBtn.addEventListener('click', stopListening);
sendBtn.addEventListener('click', () => handleQuery(textInput.value));
textInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleQuery(textInput.value);
    }
});
