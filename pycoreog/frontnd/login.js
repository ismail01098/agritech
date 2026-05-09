const loginBtn = document.querySelector('#loginBtn');
const registerBtn = document.querySelector('#registerBtn');
const loginUsername = document.querySelector('#loginUsername');
const loginPassword = document.querySelector('#loginPassword');
const loginMessage = document.querySelector('#loginMessage');

// Face auth elements
const textTab = document.querySelector('#textTab');
const faceTab = document.querySelector('#faceTab');
const textAuth = document.querySelector('#textAuth');
const faceAuth = document.querySelector('#faceAuth');
const video = document.querySelector('#video');
const canvas = document.querySelector('#canvas');
const captureBtn = document.querySelector('#captureBtn');
const faceLoginBtn = document.querySelector('#faceLoginBtn');
const faceRegisterBtn = document.querySelector('#faceRegisterBtn');

let stream;
let capturedImage = null;

async function postJson(path, data) {
    const response = await fetch(path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    return response.json();
}

function setMessage(text, type = 'info') {
    loginMessage.textContent = text;
    loginMessage.className = `api-log ${type}`;
}

async function handleAction(path) {
    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();
    if (!username || !password) {
        setMessage('Please enter both username and password.', 'warning');
        return;
    }
    setMessage('Sending request...', 'info');
    try {
        const result = await postJson(path, { username, password });
        if (result.success) {
            setMessage(result.message, 'success');
            if (path === '/api/login') {
                setTimeout(() => {
                    window.location.href = 'assistant.html';
                }, 900);
            }
        } else {
            setMessage(result.message || 'Action failed.', 'error');
        }
    } catch (error) {
        setMessage('Server error: ' + error.message, 'error');
    }
}

async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    } catch (error) {
        setMessage('Camera access denied or not available.', 'error');
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
}

function captureFace() {
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    capturedImage = canvas.toDataURL('image/jpeg');
    setMessage('Face captured successfully.', 'success');
}

async function handleFaceAction(path, username = null) {
    if (!capturedImage) {
        setMessage('Please capture your face first.', 'warning');
        return;
    }
    setMessage('Processing face...', 'info');
    try {
        const data = { face_image: capturedImage };
        if (username) data.username = username;
        if (path === '/api/register') data.password = 'dummy'; // For face register, password is not needed but required by API
        const result = await postJson(path, data);
        if (result.success) {
            setMessage(result.message, 'success');
            if (path === '/api/face_login') {
                setTimeout(() => {
                    window.location.href = 'assistant.html';
                }, 900);
            }
        } else {
            setMessage(result.message || 'Action failed.', 'error');
        }
    } catch (error) {
        setMessage('Basic face detection active. Try capturing your face again.', 'info');
    }
}

textTab.addEventListener('click', () => {
    textTab.classList.add('active');
    faceTab.classList.remove('active');
    textAuth.classList.remove('hidden');
    faceAuth.classList.add('hidden');
    stopCamera();
});

faceTab.addEventListener('click', () => {
    faceTab.classList.add('active');
    textTab.classList.remove('active');
    faceAuth.classList.remove('hidden');
    textAuth.classList.add('hidden');
    startCamera();
});

captureBtn.addEventListener('click', captureFace);
faceLoginBtn.addEventListener('click', () => handleFaceAction('/api/face_login'));
faceRegisterBtn.addEventListener('click', () => {
    const username = prompt('Enter username for face registration:');
    if (username) handleFaceAction('/api/register', username);
});

loginBtn.addEventListener('click', () => handleAction('/api/login'));
registerBtn.addEventListener('click', () => handleAction('/api/register'));
