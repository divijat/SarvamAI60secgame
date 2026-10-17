# 🎙️ The 60-Second Interrogation

> **Sarvam AI Buildathon Submission**  
> A high-stakes, real-time voice detective game powered by Sarvam AI's Speech & Indic Intelligence models.

---

## 🕵️‍♂️ Game Overview

You are the Detective. In the interrogation room sits a Classified Suspect who has assumed a secret identity. 

You have **exactly 60 seconds** on the clock.
- **Hold the Push-to-Talk button** (or hold `Spacebar`) and ask questions into your microphone.
- The suspect is bound to strictly answer with **"Yes"**, **"No"**, **"Sometimes"**, or **"Irrelevant"**.
- Your mission: Interrogate the suspect, deduce clues, and guess the secret identity before the timer strikes zero!

---

## ⚡ Tech Stack & Architecture

- **Frontend**: Clean, lightweight Vanilla HTML5 / Modern CSS3 / ES6+ JavaScript
  - Zero heavy `node_modules` dependencies, instant load time.
  - Interactive SVG circular countdown dial with color transitions (Cyan → Amber → Critical Red).
  - Tactile, glowing Push-to-Talk button with animated radar pulse rings.
  - Live conversation log with auto-scroll.
  - Native browser `MediaRecorder` audio capture.
- **Backend**: Python 3 HTTP Server (`server.py`)
  - Direct binary audio stream ingestion.
  - Automatic `.env` secret management.
  - Integrated with Sarvam AI REST endpoints using Python `requests`.
- **Sarvam AI Integrations**:
  - 🗣️ **STT**: `saaras:v4` Speech-to-Text with automatic language detection & transliteration.
  - 🧠 **LLM Persona Engine**: Strict 20-Questions deductive system prompt logic.
  - 🔊 **TTS**: Real-time audio synthesis playback of the AI's answers.

---

## 🚀 Quickstart & Setup

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/the-60-second-interrogation.git
cd the-60-second-interrogation
```

### 2. Configure your Sarvam AI API Key
Copy the example environment file and insert your Sarvam API key:
```bash
cp .env.example .env
```
Edit `.env`:
```env
SARVAM_API_KEY=your_actual_sarvam_api_key_here
```

### 3. Launch the Server
```bash
python3 server.py
```
Open your browser at **`http://localhost:3000`** and begin the interrogation!

---

## 🗺️ Buildathon Iterative Roadmap

- [x] **Phase 1: Basic Scaffolding & UI State** (Noir theme, 60s countdown dial, PTT button, conversation transcript)
- [x] **Phase 2: Audio Capture & Backend Routing** (Browser `MediaRecorder` audio streaming, binary backend route)
- [x] **Phase 3: Sarvam STT Integration** (`saaras:v4` Speech-to-Text live audio transcription)
- [ ] **Phase 4: Persona Engine (LLM Integration)** (Strict yes/no prompt, victory trigger on guess)
- [ ] **Phase 5: Sarvam TTS Integration** (Voice response playback from suspect)
- [ ] **Phase 6: Game Loop & Polish** (Identity pool, game over state, audio effects)

---

## 📜 License
MIT License. Built with ❤️ for the Sarvam AI Buildathon.
