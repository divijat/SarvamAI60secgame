/**
 * The 60-Second Interrogation - Phase 2: Audio Capture & Backend Routing
 * Captures microphone audio via MediaRecorder and streams it to the Python backend /api/audio route.
 */

// --- Game State ---
const TOTAL_TIME = 60; // 60-second countdown limit
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 70; // 439.8px

let timeRemaining = TOTAL_TIME;
let timerInterval = null;
let hasStarted = false;
let isHoldingPTT = false;

// Microphone & MediaRecorder state
let mediaStream = null;
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = 0;
let isTransmitting = false;

// Local state for conversation log
const conversationLog = [
  {
    sender: 'ai',
    text: "The interrogation chamber is active. I have taken on a classified identity. You have 60 seconds—hold the button and speak into your microphone.",
    time: "00:00"
  }
];

// --- DOM Elements ---
const timerDisplay = document.getElementById('timerDisplay');
const timerStatus = document.getElementById('timerStatus');
const timerProgress = document.getElementById('timerProgress');
const chatLog = document.getElementById('chatLog');
const turnCounter = document.getElementById('turnCounter');
const pttButton = document.getElementById('pttButton');
const pttLabel = document.getElementById('pttLabel');
const resetBtn = document.getElementById('resetBtn');
const pulseRing1 = document.getElementById('pulseRing1');
const pulseRing2 = document.getElementById('pulseRing2');
const gameStatusBanner = document.getElementById('gameStatusBanner');
const bannerTitle = document.getElementById('bannerTitle');
const bannerSubtitle = document.getElementById('bannerSubtitle');
const micBadge = document.getElementById('micBadge');

// --- Initialization ---
async function init() {
  renderChatLog();
  updateTimerUI();
  setupEventListeners();
  // Attempt to pre-warm microphone permissions gracefully
  checkMicrophonePermission();
}

// --- Check / Request Microphone ---
async function checkMicrophonePermission() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (micBadge) {
      micBadge.textContent = "🎤 MIC: UNSUPPORTED";
      micBadge.style.color = "var(--accent-danger)";
    }
    return false;
  }

  try {
    // If permission was already granted previously, get stream
    if (navigator.permissions && navigator.permissions.query) {
      const status = await navigator.permissions.query({ name: 'microphone' });
      if (status.state === 'granted') {
        await initMicrophoneStream();
      }
    }
  } catch (e) {
    // Some browsers don't support microphone query; will request on first press
  }
  return true;
}

async function initMicrophoneStream() {
  if (mediaStream) return true;
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true
      }
    });

    if (micBadge) {
      micBadge.textContent = "🎤 MIC: ACTIVE";
      micBadge.style.color = "var(--accent-success)";
    }
    return true;
  } catch (err) {
    console.error("Microphone access failed:", err);
    if (micBadge) {
      micBadge.textContent = "🎤 MIC: PERMISSION NEEDED";
      micBadge.style.color = "var(--accent-amber)";
    }
    return false;
  }
}

function getSupportedMimeType() {
  const mimeTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/wav'
  ];
  for (const t of mimeTypes) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return '';
}

// --- Render Conversation Log ---
function renderChatLog() {
  chatLog.innerHTML = '';

  conversationLog.forEach((msg) => {
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${msg.sender}`;

    const meta = document.createElement('div');
    meta.className = 'message-meta';
    
    if (msg.sender === 'user') {
      meta.innerHTML = `<span>DETECTIVE (YOU)</span> • <span>${msg.time}</span>`;
    } else {
      meta.innerHTML = `<span>CLASSIFIED SUSPECT</span> • <span>${msg.time}</span>`;
    }

    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = msg.text;

    bubble.appendChild(meta);
    bubble.appendChild(content);
    chatLog.appendChild(bubble);
  });

  // Auto scroll to latest message
  chatLog.scrollTop = chatLog.scrollHeight;

  // Update exchange counter
  const userCount = conversationLog.filter(m => m.sender === 'user').length;
  turnCounter.textContent = `${userCount} question${userCount === 1 ? '' : 's'} asked`;
}

// --- Append New Message ---
function appendMessage(sender, text) {
  const elapsed = TOTAL_TIME - timeRemaining;
  const timeFormatted = formatTime(elapsed);

  conversationLog.push({
    sender,
    text,
    time: timeFormatted
  });

  renderChatLog();
}

// --- Timer Logic ---
function startTimerIfNeeded() {
  if (hasStarted) return;
  hasStarted = true;

  timerStatus.textContent = "INTERROGATING";
  timerStatus.className = "timer-status active";

  timerInterval = setInterval(() => {
    timeRemaining--;
    updateTimerUI();

    if (timeRemaining <= 0) {
      handleTimeExpired();
    }
  }, 1000);
}

function updateTimerUI() {
  timerDisplay.textContent = formatTime(timeRemaining);

  const progressRatio = (TOTAL_TIME - timeRemaining) / TOTAL_TIME;
  const offset = CIRCLE_CIRCUMFERENCE * progressRatio;
  timerProgress.style.strokeDashoffset = offset;

  if (timeRemaining <= 10) {
    timerProgress.className = "timer-progress danger";
    timerDisplay.className = "timer-digits danger";
    timerStatus.textContent = "CRITICAL";
    timerStatus.className = "timer-status danger";
  } else if (timeRemaining <= 30) {
    timerProgress.className = "timer-progress warning";
    timerDisplay.className = "timer-digits";
    timerStatus.textContent = "30s REMAINING";
    timerStatus.className = "timer-status";
  } else {
    timerProgress.className = "timer-progress";
    timerDisplay.className = "timer-digits";
  }
}

function handleTimeExpired() {
  clearInterval(timerInterval);
  timerInterval = null;
  timeRemaining = 0;
  updateTimerUI();

  if (isHoldingPTT) {
    stopPTT();
  }

  timerStatus.textContent = "EXPIRED";
  timerStatus.className = "timer-status danger";
  pttButton.disabled = true;
  pttButton.style.opacity = '0.4';
  pttLabel.textContent = "TIME UP";

  gameStatusBanner.classList.remove('hidden');
  bannerTitle.textContent = "TIME EXPIRED";
  bannerTitle.style.color = "var(--accent-danger)";
  bannerSubtitle.textContent = "The suspect refused to break. Interrogation failed! Hit Reset to try again.";
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// --- Push-To-Talk Audio Capture (Phase 2) ---
async function startPTT() {
  if (isHoldingPTT || isTransmitting || timeRemaining <= 0) return;

  // Ensure microphone stream is active
  if (!mediaStream) {
    pttLabel.textContent = "REQUESTING MIC...";
    const ok = await initMicrophoneStream();
    if (!ok) {
      alert("Microphone permission is required to capture audio. Please enable it in browser settings.");
      pttLabel.textContent = "HOLD TO TALK";
      return;
    }
  }

  isHoldingPTT = true;
  audioChunks = [];
  recordingStartTime = Date.now();

  // Start the 60-second timer on first interrogation
  startTimerIfNeeded();

  // Visual cues
  pttButton.classList.add('recording');
  pttLabel.textContent = "RECORDING...";
  pulseRing1.classList.add('active-1');
  pulseRing2.classList.add('active-2');

  try {
    const mimeType = getSupportedMimeType();
    const options = mimeType ? { mimeType } : {};
    mediaRecorder = new MediaRecorder(mediaStream, options);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.start(100); // Collect in 100ms chunks
    console.log(`🎙️ Recording started using format: ${mediaRecorder.mimeType}`);
  } catch (err) {
    console.error("Failed to start MediaRecorder:", err);
    stopPTT();
  }
}

async function stopPTT() {
  if (!isHoldingPTT) return;
  isHoldingPTT = false;

  // Reset visual cues
  pttButton.classList.remove('recording');
  pulseRing1.classList.remove('active-1');
  pulseRing2.classList.remove('active-2');

  const durationMs = Date.now() - recordingStartTime;

  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    pttLabel.textContent = "HOLD TO TALK";
    return;
  }

  // Handle when audio recording completes
  mediaRecorder.onstop = async () => {
    const mimeType = mediaRecorder.mimeType || 'audio/webm';
    const audioBlob = new Blob(audioChunks, { type: mimeType });

    console.log(`🎙️ Recording finished: ${durationMs}ms, size: ${audioBlob.size} bytes, type: ${mimeType}`);

    // If audio is too short (e.g., accidental brief click < 400ms)
    if (durationMs < 400 || audioBlob.size < 600) {
      console.warn("Audio recording was too brief. Speak while holding the button.");
      pttLabel.textContent = "TOO SHORT!";
      setTimeout(() => {
        if (!isHoldingPTT) pttLabel.textContent = "HOLD TO TALK";
      }, 1000);
      return;
    }

    // Transmit audio blob to the backend
    await sendAudioToBackend(audioBlob, mimeType);
  };

  try {
    mediaRecorder.stop();
  } catch (e) {
    console.error("Error stopping recorder:", e);
  }
}

// --- Send Audio to Backend Route (/api/audio -> Sarvam STT) ---
async function sendAudioToBackend(audioBlob, mimeType) {
  isTransmitting = true;
  pttLabel.textContent = "TRANSCRIBING...";

  try {
    console.log(`📤 Forwarding audio (${(audioBlob.size / 1024).toFixed(1)} KB) to Sarvam STT...`);
    
    const response = await fetch('/api/audio', {
      method: 'POST',
      headers: {
        'Content-Type': mimeType
      },
      body: audioBlob
    });

    const data = await response.json();

    if (!response.ok || data.status === 'error') {
      console.error("❌ STT Error:", data);
      if (data.error_type === 'MISSING_API_KEY') {
        appendMessage('ai', "⚠️ SARVAM_API_KEY is not set in your .env file! Please add SARVAM_API_KEY=your_key to ~/SarvanAI/.env and restart server.py.");
      } else {
        appendMessage('ai', `⚠️ STT Error: ${data.message || 'Speech recognition failed.'}`);
      }
      return;
    }

    console.log("✅ [SARVAM STT TRANSCRIPTION]:", data);

    // 1. Display the real transcribed question spoken by the user
    const transcript = data.transcript || "(No speech detected)";
    appendMessage('user', transcript);

    // 2. Phase 3 placeholder response confirming STT success
    setTimeout(() => {
      if (timeRemaining > 0) {
        appendMessage('ai', "Understood. (Speech-to-Text verified! Ready for Phase 4 LLM Persona Engine).");
      }
    }, 450);

  } catch (err) {
    console.error("❌ Failed to reach backend:", err);
    appendMessage('ai', "⚠️ Could not connect to backend server. Make sure 'python3 server.py' is running!");
  } finally {
    isTransmitting = false;
    if (!isHoldingPTT && timeRemaining > 0) {
      pttLabel.textContent = "HOLD TO TALK";
    }
  }
}

// --- Reset Session ---
function resetGame() {
  clearInterval(timerInterval);
  timerInterval = null;
  hasStarted = false;
  isHoldingPTT = false;
  isTransmitting = false;
  timeRemaining = TOTAL_TIME;

  conversationLog.length = 0;
  conversationLog.push({
    sender: 'ai',
    text: "The interrogation chamber is active. I have taken on a classified identity. You have 60 seconds—hold the button and speak into your microphone.",
    time: "00:00"
  });

  pttButton.disabled = false;
  pttButton.style.opacity = '1';
  pttLabel.textContent = "HOLD TO TALK";
  pttButton.classList.remove('recording');
  pulseRing1.classList.remove('active-1');
  pulseRing2.classList.remove('active-2');

  timerStatus.textContent = "STANDBY";
  timerStatus.className = "timer-status";

  gameStatusBanner.classList.add('hidden');

  renderChatLog();
  updateTimerUI();
}

// --- Event Listeners ---
function setupEventListeners() {
  // Mouse events for PTT
  pttButton.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startPTT();
  });

  window.addEventListener('mouseup', () => {
    if (isHoldingPTT) stopPTT();
  });

  // Touch events for mobile
  pttButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startPTT();
  }, { passive: false });

  window.addEventListener('touchend', () => {
    if (isHoldingPTT) stopPTT();
  });

  // Spacebar hold to talk
  let spacePressed = false;
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !spacePressed && e.target === document.body) {
      e.preventDefault();
      spacePressed = true;
      startPTT();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && spacePressed) {
      e.preventDefault();
      spacePressed = false;
      stopPTT();
    }
  });

  // Reset button
  resetBtn.addEventListener('click', resetGame);
}

// Launch application
init();
