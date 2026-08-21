/* =====================================================
   Hand Flute — app.js
   Gesture detection + Flute synthesis
   ===================================================== */

'use strict';

// ─── Configuration ──────────────────────────────────────────────
const GESTURE_NOTES = {
  thumb:  { name: 'C4',  freq: 261.63, emoji: '👍', label: 'Thumbs Up',  theme: 'theme-thumb' },
  '1':    { name: 'E4',  freq: 329.63, emoji: '☝️', label: '1 Finger',   theme: 'theme-1' },
  '2':    { name: 'G4',  freq: 392.00, emoji: '✌️', label: '2 Fingers',  theme: 'theme-2' },
  '3':    { name: 'A4',  freq: 440.00, emoji: '🤟', label: '3 Fingers',  theme: 'theme-3' },
  open:   { name: 'C5',  freq: 523.25, emoji: '✋', label: 'Open Palm',  theme: 'theme-open' },
  none:   { name: '—',   freq: 0,      emoji: '✊', label: 'No Gesture', theme: '' },
};

// Landmark indices (MediaPipe Hands)
const TIP = { THUMB: 4, INDEX: 8, MIDDLE: 12, RING: 16, PINKY: 20 };
const MCP = { THUMB: 2, INDEX: 5, MIDDLE: 9,  RING: 13, PINKY: 17 };
const IP  = { THUMB: 3 };

// ─── DOM References ─────────────────────────────────────────────
const video          = document.getElementById('webcamVideo');
const canvas         = document.getElementById('overlayCanvas');
const ctx            = canvas.getContext('2d');
const btnStart       = document.getElementById('btnStart');
const startOverlay   = document.getElementById('cameraStartOverlay');
const gestureOverlay = document.getElementById('gestureOverlay');
const gestureEmoji   = document.getElementById('gestureEmoji');
const gestureName    = document.getElementById('gestureName');
const notePill       = document.getElementById('notePill');
const notePillText   = document.getElementById('notePillText');
const noteCard       = document.getElementById('noteCard');
const currentNoteName = document.getElementById('currentNoteName');
const currentNoteFreq = document.getElementById('currentNoteFreq');
const statusBadge    = document.getElementById('statusBadge');
const statusText     = document.getElementById('statusText');
const waveBars       = Array.from({ length: 7 }, (_, i) => document.getElementById(`waveBar${i + 1}`));
const volumeSlider   = document.getElementById('volumeSlider');
const vibratoSlider  = document.getElementById('vibratoSlider');
const cameraWrapper  = document.getElementById('cameraWrapper');
const bgParticles    = document.getElementById('bgParticles');

// ─── State ──────────────────────────────────────────────────────
let audioCtx         = null;
let masterGain       = null;
let oscillator1      = null;   // fundamental (sine)
let oscillator2      = null;   // sub-octave (sine, low amplitude for warmth)
let noiseSource      = null;   // breath noise
let noiseGain        = null;
let lfo              = null;   // vibrato LFO
let lfoGain          = null;
let filterNode       = null;
let outputGain       = null;
let isPlaying        = false;
let currentGesture   = 'none';
let gestureHistory   = [];     // smoothing buffer
const HISTORY_LEN    = 6;

// ─── Background Particles ────────────────────────────────────────
function spawnParticles() {
  const COLORS = ['#a78bfa', '#60a5fa', '#34d399', '#f472b6', '#fb923c'];
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 6 + 2;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const left = Math.random() * 100;
    const dur  = Math.random() * 18 + 10;
    const delay = Math.random() * 15;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      background:${color};
      left:${left}%;
      bottom:-10px;
      animation-duration:${dur}s;
      animation-delay:${delay}s;
      filter: blur(${Math.random() > 0.5 ? '1px' : '0'});
    `;
    bgParticles.appendChild(p);
  }
}

// ─── Audio Engine ────────────────────────────────────────────────
function initAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // Master volume
  masterGain = audioCtx.createGain();
  masterGain.gain.value = parseFloat(volumeSlider.value);
  masterGain.connect(audioCtx.destination);

  // Low-pass filter for flute tone (remove harsh highs)
  filterNode = audioCtx.createBiquadFilter();
  filterNode.type = 'lowpass';
  filterNode.frequency.value = 2200;
  filterNode.Q.value = 0.8;
  filterNode.connect(masterGain);

  // Output gain (controls note on/off smoothly)
  outputGain = audioCtx.createGain();
  outputGain.gain.value = 0;
  outputGain.connect(filterNode);

  // Vibrato LFO
  lfo = audioCtx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 5.5;

  lfoGain = audioCtx.createGain();
  lfoGain.gain.value = parseFloat(vibratoSlider.value);
  lfo.connect(lfoGain);
  lfo.start();

  // Primary oscillator — sine wave (flute fundamental)
  oscillator1 = audioCtx.createOscillator();
  oscillator1.type = 'sine';
  oscillator1.frequency.value = 440;
  lfoGain.connect(oscillator1.frequency);
  oscillator1.connect(outputGain);
  oscillator1.start();

  // Secondary oscillator — slight detune for warmth
  oscillator2 = audioCtx.createOscillator();
  oscillator2.type = 'sine';
  oscillator2.frequency.value = 440;
  lfoGain.connect(oscillator2.frequency);
  const osc2Gain = audioCtx.createGain();
  osc2Gain.gain.value = 0.12; // subtle blend
  oscillator2.connect(osc2Gain);
  osc2Gain.connect(outputGain);
  oscillator2.start();

  // Breath noise (white noise through a band-pass for breathiness)
  const bufferSize = audioCtx.sampleRate * 2;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 900;
  noiseFilter.Q.value = 0.7;

  noiseGain = audioCtx.createGain();
  noiseGain.gain.value = 0.04; // quiet breath

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(outputGain);
  noiseSource.start();
}

function playNote(freq) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const now = audioCtx.currentTime;

  if (freq > 0) {
    // Smoothly glide to new frequency
    oscillator1.frequency.cancelScheduledValues(now);
    oscillator1.frequency.setTargetAtTime(freq, now, 0.04);

    oscillator2.frequency.cancelScheduledValues(now);
    oscillator2.frequency.setTargetAtTime(freq * 1.003, now, 0.04); // slight detune

    // Fade in
    outputGain.gain.cancelScheduledValues(now);
    outputGain.gain.setTargetAtTime(0.75, now, 0.06);

    isPlaying = true;
  } else {
    // Fade out
    outputGain.gain.cancelScheduledValues(now);
    outputGain.gain.setTargetAtTime(0, now, 0.08);
    isPlaying = false;
  }
}

// ─── Gesture Recognition ─────────────────────────────────────────
function isFingerUp(landmarks, tipIdx, mcpIdx) {
  return landmarks[tipIdx].y < landmarks[mcpIdx].y;
}

function isThumbUp(landmarks) {
  // Thumb up: thumb tip is above IP joint, other fingers curled
  const thumbUp = landmarks[TIP.THUMB].y < landmarks[IP.THUMB].y;
  const indexDown  = !isFingerUp(landmarks, TIP.INDEX,  MCP.INDEX);
  const middleDown = !isFingerUp(landmarks, TIP.MIDDLE, MCP.MIDDLE);
  const ringDown   = !isFingerUp(landmarks, TIP.RING,   MCP.RING);
  const pinkyDown  = !isFingerUp(landmarks, TIP.PINKY,  MCP.PINKY);
  return thumbUp && indexDown && middleDown && ringDown && pinkyDown;
}

function detectGesture(landmarks) {
  const indexUp  = isFingerUp(landmarks, TIP.INDEX,  MCP.INDEX);
  const middleUp = isFingerUp(landmarks, TIP.MIDDLE, MCP.MIDDLE);
  const ringUp   = isFingerUp(landmarks, TIP.RING,   MCP.RING);
  const pinkyUp  = isFingerUp(landmarks, TIP.PINKY,  MCP.PINKY);

  const extendedCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;

  if (extendedCount === 4 || (extendedCount === 4 && pinkyUp)) return 'open';
  if (extendedCount === 0 && isThumbUp(landmarks)) return 'thumb';
  if (extendedCount === 1 && indexUp)  return '1';
  if (extendedCount === 2 && indexUp && middleUp) return '2';
  if (extendedCount === 3 && indexUp && middleUp && ringUp) return '3';
  if (extendedCount >= 4) return 'open';

  return 'none';
}

// Smooth gesture by majority vote over history
function smoothGesture(gesture) {
  gestureHistory.push(gesture);
  if (gestureHistory.length > HISTORY_LEN) gestureHistory.shift();

  const counts = {};
  gestureHistory.forEach(g => { counts[g] = (counts[g] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// ─── UI Updates ──────────────────────────────────────────────────
function updateUI(gesture) {
  const note = GESTURE_NOTES[gesture];
  if (!note) return;

  // Gesture label overlay on camera
  gestureEmoji.textContent = note.emoji;
  gestureName.textContent  = note.label;

  // Note pill (top-right of camera)
  notePillText.textContent = note.name;

  // Note card
  currentNoteName.textContent = note.name;
  currentNoteFreq.textContent = note.freq > 0 ? `${note.freq.toFixed(0)} Hz` : '— Hz';

  // Theme color
  noteCard.className = `card note-card ${note.theme}`;

  // Wave bars animation
  const playing = note.freq > 0;
  waveBars.forEach(bar => {
    bar.classList.toggle('active', playing);
  });

  // Highlight active gesture in guide
  document.querySelectorAll('.gesture-item').forEach(el => {
    el.classList.remove('active');
  });
  const guideKey = gesture === 'none' ? 'none' : gesture;
  const activeGuide = document.getElementById(`guide-${guideKey}`);
  if (activeGuide) activeGuide.classList.add('active');

  // Note pill color
  if (note.theme) {
    const colors = {
      'theme-thumb': ['rgba(167,139,250,0.2)', 'rgba(167,139,250,0.4)', '#a78bfa'],
      'theme-1':     ['rgba(96,165,250,0.2)',  'rgba(96,165,250,0.4)',  '#60a5fa'],
      'theme-2':     ['rgba(52,211,153,0.2)',  'rgba(52,211,153,0.4)', '#34d399'],
      'theme-3':     ['rgba(251,146,60,0.2)',  'rgba(251,146,60,0.4)', '#fb923c'],
      'theme-open':  ['rgba(244,114,182,0.2)', 'rgba(244,114,182,0.4)','#f472b6'],
    };
    const c = colors[note.theme];
    if (c) {
      notePill.style.background = c[0];
      notePill.style.borderColor = c[1];
      notePill.style.color = c[2];
    }
  }
}

// ─── Canvas Drawing ──────────────────────────────────────────────
function drawHand(results) {
  ctx.save();
  // Mirror the canvas to match flipped video
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    for (const landmarks of results.multiHandLandmarks) {
      // Draw connections
      drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
        color: 'rgba(167,139,250,0.55)',
        lineWidth: 2,
      });

      // Draw landmarks
      drawLandmarks(ctx, landmarks, {
        color: 'rgba(255,255,255,0.9)',
        fillColor: 'rgba(167,139,250,0.8)',
        radius: 5,
        lineWidth: 1,
      });
    }
  }

  ctx.restore();
}

// ─── MediaPipe Setup ─────────────────────────────────────────────
function initMediaPipe() {
  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.6,
  });

  hands.onResults((results) => {
    // Sync canvas size to video
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;

    drawHand(results);

    let gesture = 'none';
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      gesture = detectGesture(results.multiHandLandmarks[0]);
    }

    const smoothed = smoothGesture(gesture);

    if (smoothed !== currentGesture) {
      currentGesture = smoothed;
      const note = GESTURE_NOTES[smoothed];
      playNote(note.freq);
      updateUI(smoothed);
    }
  });

  // MediaPipe Camera utility
  const camera = new Camera(video, {
    onFrame: async () => {
      await hands.send({ image: video });
    },
    width: 1280,
    height: 720,
  });

  camera.start().then(() => {
    // Camera running — show the UI
    video.style.display   = 'block';
    canvas.style.display  = 'block';
    gestureOverlay.style.display = 'block';
    notePill.style.display = 'block';
    startOverlay.classList.add('hidden');
    cameraWrapper.classList.add('playing');
    statusBadge.classList.add('active');
    statusText.textContent = 'Live';
    updateUI('none');
  }).catch((err) => {
    console.error('Camera error:', err);
    alert('Could not access camera. Please allow camera permissions and try again.');
  });
}

// ─── Volume & Vibrato Controls ───────────────────────────────────
volumeSlider.addEventListener('input', () => {
  if (masterGain) {
    masterGain.gain.setTargetAtTime(parseFloat(volumeSlider.value), audioCtx.currentTime, 0.02);
  }
});

vibratoSlider.addEventListener('input', () => {
  if (lfoGain) {
    lfoGain.gain.setTargetAtTime(parseFloat(vibratoSlider.value), audioCtx.currentTime, 0.02);
  }
});

// ─── Start Button ────────────────────────────────────────────────
btnStart.addEventListener('click', async () => {
  btnStart.disabled = true;
  btnStart.querySelector('span').textContent = 'Starting…';

  // Audio context must be created on user gesture
  initAudio();

  // Small resume ping
  if (audioCtx.state === 'suspended') await audioCtx.resume();

  // Load MediaPipe
  initMediaPipe();
});

// ─── Init ────────────────────────────────────────────────────────
spawnParticles();
