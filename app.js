/* =====================================================
   Hand Flute — app.js
   Gesture detection + Flute synthesis + Song Sequencer
   ===================================================== */

'use strict';

// ─── Note Frequencies ────────────────────────────────────────────
const NOTE = {
  REST: 0,
  B3:  246.94, C4:  261.63, Db4: 277.18, D4:  293.66,
  Eb4: 311.13, E4:  329.63, F4:  349.23, Gb4: 369.99,
  G4:  392.00, Ab4: 415.30, A4:  440.00, Bb4: 466.16,
  B4:  493.88, C5:  523.25, Db5: 554.37, D5:  587.33,
  Eb5: 622.25, E5:  659.25, F5:  698.46, Gb5: 739.99,
  G5:  783.99, Ab5: 830.61, A5:  880.00,
};

// ─── Song Library ────────────────────────────────────────────────
const SONGS = [
  {
    name: 'Seven Nation Army',
    artist: 'The White Stripes',
    emoji: '🎸',
    color: '#f472b6',
    bpm: 124,
    // Each entry: [frequency, beats]
    notes: [
      [NOTE.E4,  1.0], [NOTE.E4,  0.5], [NOTE.G4,  0.5],
      [NOTE.E4,  1.0], [NOTE.REST,0.25],[NOTE.D4,  0.5],
      [NOTE.C4,  1.5], [NOTE.B3,  2.0], [NOTE.REST,0.5],
      [NOTE.E4,  1.0], [NOTE.E4,  0.5], [NOTE.G4,  0.5],
      [NOTE.E4,  1.0], [NOTE.REST,0.25],[NOTE.D4,  0.5],
      [NOTE.Eb4, 0.5], [NOTE.D4,  2.0], [NOTE.REST,0.5],
    ],
  },
  {
    name: 'Blinding Lights',
    artist: 'The Weeknd',
    emoji: '🌟',
    color: '#a78bfa',
    bpm: 171,
    notes: [
      [NOTE.A4,  0.5], [NOTE.A4,  0.25],[NOTE.B4,  0.25],
      [NOTE.C5,  0.5], [NOTE.B4,  0.5], [NOTE.A4,  1.0], [NOTE.REST,0.5],
      [NOTE.E4,  0.5], [NOTE.G4,  0.5], [NOTE.A4,  0.5],
      [NOTE.G4,  0.5], [NOTE.E4,  1.0], [NOTE.REST,0.5],
      [NOTE.A4,  0.5], [NOTE.A4,  0.25],[NOTE.B4,  0.25],
      [NOTE.C5,  0.75],[NOTE.B4,  0.25],[NOTE.A4,  0.5],
      [NOTE.G4,  0.5], [NOTE.F4,  0.5], [NOTE.G4,  0.5],
      [NOTE.A4,  2.0], [NOTE.REST,0.5],
    ],
  },
  {
    name: 'Shape of You',
    artist: 'Ed Sheeran',
    emoji: '❤️',
    color: '#fb923c',
    bpm: 96,
    notes: [
      [NOTE.Db5, 0.5], [NOTE.B4,  0.5], [NOTE.A4,  1.0],
      [NOTE.Gb4, 0.5], [NOTE.E4,  1.0], [NOTE.REST,0.5],
      [NOTE.B4,  0.5], [NOTE.A4,  0.5], [NOTE.Ab4, 1.0],
      [NOTE.Gb4, 0.5], [NOTE.E4,  1.5], [NOTE.REST,0.5],
      [NOTE.Db5, 0.5], [NOTE.B4,  0.5], [NOTE.A4,  0.75],
      [NOTE.Gb4, 0.25],[NOTE.E4,  0.5], [NOTE.Gb4, 0.5],
      [NOTE.Ab4, 1.5], [NOTE.REST,0.5],
    ],
  },
  {
    name: 'Bad Guy',
    artist: 'Billie Eilish',
    emoji: '😈',
    color: '#34d399',
    bpm: 135,
    notes: [
      [NOTE.G4,  0.5], [NOTE.G4,  0.5], [NOTE.Ab4, 0.5], [NOTE.G4,  1.0],
      [NOTE.F4,  0.5], [NOTE.Eb4, 0.5], [NOTE.D4,  1.5], [NOTE.REST,0.5],
      [NOTE.G4,  0.5], [NOTE.F4,  0.5], [NOTE.Eb4, 0.5],
      [NOTE.D4,  1.0], [NOTE.C4,  0.5], [NOTE.D4,  0.5],
      [NOTE.Eb4, 2.0], [NOTE.REST,0.5],
    ],
  },
  {
    name: 'As It Was',
    artist: 'Harry Styles',
    emoji: '🌸',
    color: '#60a5fa',
    bpm: 125,
    notes: [
      [NOTE.B4,  0.5], [NOTE.A4,  0.5], [NOTE.G4,  1.0],
      [NOTE.Gb4, 0.5], [NOTE.E4,  1.0], [NOTE.D4,  0.5], [NOTE.REST,0.5],
      [NOTE.B4,  0.5], [NOTE.A4,  0.5], [NOTE.G4,  0.75],
      [NOTE.A4,  0.25],[NOTE.B4,  0.5], [NOTE.A4,  0.5],
      [NOTE.G4,  2.0], [NOTE.REST,0.5],
    ],
  },
];

// ─── Configuration ──────────────────────────────────────────────
const GESTURE_NOTES = {
  thumb:  { name: 'C4',  freq: 261.63, emoji: '👍', label: 'Thumbs Up',  theme: 'theme-thumb' },
  '1':    { name: 'E4',  freq: 329.63, emoji: '☝️', label: '1 Finger',   theme: 'theme-1' },
  '2':    { name: '♫',   freq: -1,     emoji: '✌️', label: '2 Fingers — Song!', theme: 'theme-2' },
  '3':    { name: 'A4',  freq: 440.00, emoji: '🤟', label: '3 Fingers',  theme: 'theme-3' },
  open:   { name: 'C5',  freq: 523.25, emoji: '✋', label: 'Open Palm',  theme: 'theme-open' },
  none:   { name: '—',   freq: 0,      emoji: '✊', label: 'No Gesture', theme: '' },
};

// Landmark indices (MediaPipe Hands)
const TIP = { THUMB: 4, INDEX: 8, MIDDLE: 12, RING: 16, PINKY: 20 };
const MCP = { THUMB: 2, INDEX: 5, MIDDLE: 9,  RING: 13, PINKY: 17 };
const IP  = { THUMB: 3 };

// ─── DOM References ─────────────────────────────────────────────
const video            = document.getElementById('webcamVideo');
const canvas           = document.getElementById('overlayCanvas');
const ctx              = canvas.getContext('2d');
const btnStart         = document.getElementById('btnStart');
const startOverlay     = document.getElementById('cameraStartOverlay');
const gestureOverlay   = document.getElementById('gestureOverlay');
const gestureEmoji     = document.getElementById('gestureEmoji');
const gestureName      = document.getElementById('gestureName');
const notePill         = document.getElementById('notePill');
const notePillText     = document.getElementById('notePillText');
const noteCard         = document.getElementById('noteCard');
const currentNoteName  = document.getElementById('currentNoteName');
const currentNoteFreq  = document.getElementById('currentNoteFreq');
const statusBadge      = document.getElementById('statusBadge');
const statusText       = document.getElementById('statusText');
const waveBars         = Array.from({ length: 7 }, (_, i) => document.getElementById(`waveBar${i + 1}`));
const volumeSlider     = document.getElementById('volumeSlider');
const vibratoSlider    = document.getElementById('vibratoSlider');
const cameraWrapper    = document.getElementById('cameraWrapper');
const bgParticles      = document.getElementById('bgParticles');
// Song mode DOM
const songModePanel    = document.getElementById('songModePanel');
const nowPlayingTitle  = document.getElementById('nowPlayingTitle');
const nowPlayingArtist = document.getElementById('nowPlayingArtist');
const nowPlayingEmoji  = document.getElementById('nowPlayingEmoji');
const songCards        = document.querySelectorAll('.song-card');

// ─── State ──────────────────────────────────────────────────────
let audioCtx         = null;
let masterGain       = null;
let oscillator1      = null;
let oscillator2      = null;
let noiseSource      = null;
let noiseGain        = null;
let lfo              = null;
let lfoGain          = null;
let filterNode       = null;
let outputGain       = null;
let isPlaying        = false;
let currentGesture   = 'none';
let gestureHistory   = [];
const HISTORY_LEN    = 6;
let activeSongIndex  = 0;    // which song is selected
let songPlayer       = null; // SongPlayer instance

// ─── Background Particles ────────────────────────────────────────
function spawnParticles() {
  const COLORS = ['#a78bfa', '#60a5fa', '#34d399', '#f472b6', '#fb923c'];
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size  = Math.random() * 6 + 2;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const left  = Math.random() * 100;
    const dur   = Math.random() * 18 + 10;
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

  masterGain = audioCtx.createGain();
  masterGain.gain.value = parseFloat(volumeSlider.value);
  masterGain.connect(audioCtx.destination);

  filterNode = audioCtx.createBiquadFilter();
  filterNode.type = 'lowpass';
  filterNode.frequency.value = 2200;
  filterNode.Q.value = 0.8;
  filterNode.connect(masterGain);

  outputGain = audioCtx.createGain();
  outputGain.gain.value = 0;
  outputGain.connect(filterNode);

  lfo = audioCtx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 5.5;

  lfoGain = audioCtx.createGain();
  lfoGain.gain.value = parseFloat(vibratoSlider.value);
  lfo.connect(lfoGain);
  lfo.start();

  oscillator1 = audioCtx.createOscillator();
  oscillator1.type = 'sine';
  oscillator1.frequency.value = 440;
  lfoGain.connect(oscillator1.frequency);
  oscillator1.connect(outputGain);
  oscillator1.start();

  oscillator2 = audioCtx.createOscillator();
  oscillator2.type = 'sine';
  oscillator2.frequency.value = 440;
  lfoGain.connect(oscillator2.frequency);
  const osc2Gain = audioCtx.createGain();
  osc2Gain.gain.value = 0.12;
  oscillator2.connect(osc2Gain);
  osc2Gain.connect(outputGain);
  oscillator2.start();

  const bufferSize  = audioCtx.sampleRate * 2;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data        = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 900;
  noiseFilter.Q.value = 0.7;

  noiseGain = audioCtx.createGain();
  noiseGain.gain.value = 0.04;

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(outputGain);
  noiseSource.start();
}

/** Play a continuous single note (for non-song gestures) */
function playNote(freq) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const now = audioCtx.currentTime;

  if (freq > 0) {
    oscillator1.frequency.cancelScheduledValues(now);
    oscillator1.frequency.setTargetAtTime(freq, now, 0.04);

    oscillator2.frequency.cancelScheduledValues(now);
    oscillator2.frequency.setTargetAtTime(freq * 1.003, now, 0.04);

    outputGain.gain.cancelScheduledValues(now);
    outputGain.gain.setTargetAtTime(0.75, now, 0.06);

    isPlaying = true;
  } else {
    outputGain.gain.cancelScheduledValues(now);
    outputGain.gain.setTargetAtTime(0, now, 0.08);
    isPlaying = false;
  }
}

/** Immediately silence without scheduling */
function silenceNow() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  outputGain.gain.cancelScheduledValues(now);
  outputGain.gain.setTargetAtTime(0, now, 0.05);
  isPlaying = false;
}

// ─── Song Player ─────────────────────────────────────────────────
class SongPlayer {
  constructor() {
    this.running       = false;
    this.songIndex     = 0;
    this.noteIndex     = 0;
    this.nextNoteTime  = 0;
    this.lookahead     = 0.12;   // seconds to look ahead
    this.scheduleMs    = 40;     // scheduler interval in ms
    this._timer        = null;
    this.onNoteChange  = null;   // callback(freq)
  }

  start(songIndex = 0) {
    if (this.running) {
      // Already running — just switch song
      this.songIndex = songIndex;
      this.noteIndex = 0;
      return;
    }
    this.running      = true;
    this.songIndex    = songIndex;
    this.noteIndex    = 0;
    this.nextNoteTime = audioCtx.currentTime + 0.05;
    this._schedule();
    this._timer = setInterval(() => this._schedule(), this.scheduleMs);
  }

  stop() {
    this.running = false;
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    silenceNow();
  }

  _schedule() {
    if (!this.running) return;

    const song        = SONGS[this.songIndex];
    const beatSeconds = 60 / song.bpm;

    while (this.nextNoteTime < audioCtx.currentTime + this.lookahead) {
      const [freq, beats] = song.notes[this.noteIndex];
      const duration      = beats * beatSeconds;

      this._scheduleNote(freq, this.nextNoteTime, duration);

      this.nextNoteTime += duration;
      this.noteIndex     = (this.noteIndex + 1) % song.notes.length;
    }
  }

  _scheduleNote(freq, startTime, duration) {
    if (freq === NOTE.REST) {
      // Silence during rest
      outputGain.gain.setTargetAtTime(0, startTime, 0.025);
    } else {
      // Set frequency and articulate the note
      oscillator1.frequency.setValueAtTime(freq, startTime);
      oscillator2.frequency.setValueAtTime(freq * 1.003, startTime);

      // Attack
      outputGain.gain.setValueAtTime(0, startTime);
      outputGain.gain.linearRampToValueAtTime(0.75, startTime + 0.035);

      // Release before next note (natural articulation ~80% of duration)
      const releaseTime = startTime + duration * 0.78;
      outputGain.gain.setTargetAtTime(0, releaseTime, 0.025);

      // Update UI (coarse — only fires when note changes)
      if (this.onNoteChange) {
        const delay = Math.max(0, (startTime - audioCtx.currentTime) * 1000);
        setTimeout(() => {
          if (this.running) this.onNoteChange(freq);
        }, delay);
      }
    }
  }
}

// ─── Gesture Recognition ─────────────────────────────────────────
function isFingerUp(landmarks, tipIdx, mcpIdx) {
  return landmarks[tipIdx].y < landmarks[mcpIdx].y;
}

function isThumbUp(landmarks) {
  const thumbUp    = landmarks[TIP.THUMB].y < landmarks[IP.THUMB].y;
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

  const count = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;

  if (count === 0 && isThumbUp(landmarks)) return 'thumb';
  if (count === 1 && indexUp)                         return '1';
  if (count === 2 && indexUp && middleUp)             return '2';
  if (count === 3 && indexUp && middleUp && ringUp)   return '3';
  if (count >= 4)                                     return 'open';

  return 'none';
}

function smoothGesture(gesture) {
  gestureHistory.push(gesture);
  if (gestureHistory.length > HISTORY_LEN) gestureHistory.shift();

  const counts = {};
  gestureHistory.forEach(g => { counts[g] = (counts[g] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// ─── Song Mode UI ────────────────────────────────────────────────
function showSongMode() {
  songModePanel.classList.add('visible');
  updateSongDisplay();
}

function hideSongMode() {
  songModePanel.classList.remove('visible');
}

function updateSongDisplay() {
  const song = SONGS[activeSongIndex];
  nowPlayingTitle.textContent  = song.name;
  nowPlayingArtist.textContent = song.artist;
  nowPlayingEmoji.textContent  = song.emoji;

  // highlight active song card
  songCards.forEach((card, i) => {
    card.classList.toggle('active-song', i === activeSongIndex);
  });
}

// ─── UI Updates ──────────────────────────────────────────────────
function updateUI(gesture) {
  const note = GESTURE_NOTES[gesture];
  if (!note) return;

  gestureEmoji.textContent = note.emoji;
  gestureName.textContent  = note.label;
  notePillText.textContent = note.name;

  // Song mode — override the note card display
  if (gesture === '2') {
    const song = SONGS[activeSongIndex];
    currentNoteName.textContent = '♫';
    currentNoteFreq.textContent = `${song.name}`;
    showSongMode();
  } else {
    currentNoteName.textContent = note.name;
    currentNoteFreq.textContent = note.freq > 0 ? `${note.freq.toFixed(0)} Hz` : '— Hz';
    hideSongMode();
  }

  noteCard.className = `card note-card ${note.theme}`;

  const playing = gesture === '2' || note.freq > 0;
  waveBars.forEach(bar => bar.classList.toggle('active', playing));

  document.querySelectorAll('.gesture-item').forEach(el => el.classList.remove('active'));
  const activeGuide = document.getElementById(`guide-${gesture}`);
  if (activeGuide) activeGuide.classList.add('active');

  const colors = {
    'theme-thumb': ['rgba(167,139,250,0.2)', 'rgba(167,139,250,0.4)', '#a78bfa'],
    'theme-1':     ['rgba(96,165,250,0.2)',  'rgba(96,165,250,0.4)',  '#60a5fa'],
    'theme-2':     ['rgba(52,211,153,0.2)',  'rgba(52,211,153,0.4)', '#34d399'],
    'theme-3':     ['rgba(251,146,60,0.2)',  'rgba(251,146,60,0.4)', '#fb923c'],
    'theme-open':  ['rgba(244,114,182,0.2)', 'rgba(244,114,182,0.4)','#f472b6'],
  };
  const c = note.theme ? colors[note.theme] : null;
  if (c) {
    notePill.style.background  = c[0];
    notePill.style.borderColor = c[1];
    notePill.style.color       = c[2];
  }
}

// ─── Canvas Drawing ──────────────────────────────────────────────
function drawHand(results) {
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    // Use song color when song is playing
    const isInSongMode = currentGesture === '2';
    const connColor = isInSongMode
      ? `rgba(52,211,153,0.65)`
      : `rgba(167,139,250,0.55)`;
    const fillColor = isInSongMode
      ? `rgba(52,211,153,0.8)`
      : `rgba(167,139,250,0.8)`;

    for (const landmarks of results.multiHandLandmarks) {
      drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: connColor, lineWidth: 2 });
      drawLandmarks(ctx, landmarks, { color: 'rgba(255,255,255,0.9)', fillColor, radius: 5, lineWidth: 1 });
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
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;

    drawHand(results);

    let gesture = 'none';
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      gesture = detectGesture(results.multiHandLandmarks[0]);
    }

    const smoothed = smoothGesture(gesture);

    if (smoothed !== currentGesture) {
      const prev      = currentGesture;
      currentGesture  = smoothed;

      if (smoothed === '2') {
        // Enter song mode
        if (!songPlayer) songPlayer = new SongPlayer();
        songPlayer.onNoteChange = (freq) => {
          // Update note name in real-time while song plays
          const nameMap = {};
          Object.entries(NOTE).forEach(([k, v]) => { if (v > 0) nameMap[v] = k; });
          // fuzzy match
          const closest = Object.entries(NOTE).reduce((best, [k, v]) => {
            if (v === 0) return best;
            return Math.abs(v - freq) < Math.abs(best[1] - freq) ? [k, v] : best;
          }, ['—', 0]);
          currentNoteName.textContent = closest[0].replace(/(\d)/, '$1').replace('b', '♭');
        };
        songPlayer.start(activeSongIndex);
      } else {
        // Leave song mode
        if (songPlayer && prev === '2') {
          songPlayer.stop();
        }
        const note = GESTURE_NOTES[smoothed];
        playNote(note.freq);
      }

      updateUI(smoothed);
    }
  });

  const camera = new Camera(video, {
    onFrame: async () => { await hands.send({ image: video }); },
    width: 1280,
    height: 720,
  });

  camera.start().then(() => {
    video.style.display          = 'block';
    canvas.style.display         = 'block';
    gestureOverlay.style.display = 'block';
    notePill.style.display       = 'block';
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

// ─── Song Card Selection ─────────────────────────────────────────
songCards.forEach((card, i) => {
  card.addEventListener('click', () => {
    activeSongIndex = i;
    updateSongDisplay();
    // If already in song mode, restart with new song
    if (currentGesture === '2' && songPlayer) {
      songPlayer.start(activeSongIndex);
    }
  });
});

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

  initAudio();
  if (audioCtx.state === 'suspended') await audioCtx.resume();

  initMediaPipe();
});

// ─── Init ────────────────────────────────────────────────────────
spawnParticles();
// Populate song cards with song data
songCards.forEach((card, i) => {
  const song = SONGS[i];
  if (!song) return;
  const emoji  = card.querySelector('.song-card-emoji');
  const title  = card.querySelector('.song-card-title');
  const artist = card.querySelector('.song-card-artist');
  if (emoji)  emoji.textContent  = song.emoji;
  if (title)  title.textContent  = song.name;
  if (artist) artist.textContent = song.artist;
  card.style.setProperty('--song-color', song.color);
});
updateSongDisplay();
