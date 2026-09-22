/**
 * CardioAI — ECG Waveform & Hero Particle Canvas Engine
 * Handles real-time canvas rendering, animated pulse lines, and interactive BPM adjustment.
 */

window.ECGEngine = (function () {
  'use strict';

  let bpm = 72;
  let animId = null;
  let soundEnabled = false;
  let audioCtx = null;
  let lastBeepTime = 0;

  /**
   * Web Audio API Cardiac Beep Synthesizer
   */
  function playHeartBeep() {
    if (!soundEnabled) return;
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch (e) {}
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('btnSoundToggle');
    if (btn) {
      btn.innerHTML = soundEnabled ?
        '<i class="fa-solid fa-volume-high" style="color:#10b981;"></i> Sound: ON' :
        '<i class="fa-solid fa-volume-xmark"></i> Sound: OFF';
      btn.style.borderColor = soundEnabled ? '#10b981' : 'rgba(255,255,255,0.2)';
    }
    if (soundEnabled) playHeartBeep();
    return soundEnabled;
  }

  /**
   * Hero Background Grid & Particle Canvas
   */
  function initHeroCanvas() {
    const canvas = document.getElementById('heroCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H;

    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 1 + Math.random() * 2.5,
      vx: (Math.random() - 0.5) * 0.00015,
      vy: (Math.random() - 0.5) * 0.00015,
      alpha: 0.15 + Math.random() * 0.25
    }));

    function resize() {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W;
      canvas.height = H;
    }
    resize();
    window.addEventListener('resize', resize);

    function render() {
      ctx.clearRect(0, 0, W, H);

      // Render Ambient Grid
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.06)';
      ctx.lineWidth = 1;
      const cols = 20, rows = 12;
      for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        ctx.moveTo((c / cols) * W, 0);
        ctx.lineTo((c / cols) * W, H);
        ctx.stroke();
      }
      for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        ctx.moveTo(0, (r / rows) * H);
        ctx.lineTo(W, (r / rows) * H);
        ctx.stroke();
      }

      // Render Floating Particles
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = 1;
        if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1;
        if (p.y > 1) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(244, 63, 94, ${p.alpha})`;
        ctx.fill();
      });

      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
  }

  /**
   * Interactive ECG Monitor Canvas
   */
  function initMiniEcg() {
    const canvas = document.getElementById('miniEcg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, offset = 0;

    function resize() {
      W = canvas.offsetWidth;
      H = 80;
      canvas.width = W;
      canvas.height = H;
    }
    resize();
    window.addEventListener('resize', resize);

    // ECG PQRST Complex sample shape normalized [time, amplitude]
    const pqrst = [
      [0, 0], [0.1, 0], [0.13, -0.06], [0.15, 0.08], [0.17, 0],
      [0.22, 0], [0.25, -0.85], [0.28, 1.3], [0.3, -0.5], [0.33, 0],
      [0.36, 0.18], [0.4, 0.22], [0.44, 0.18], [0.48, 0], [1, 0]
    ];

    function getSample(t) {
      t = t % 1;
      if (t < 0) t += 1;
      for (let i = 1; i < pqrst.length; i++) {
        if (t <= pqrst[i][0]) {
          const s = (t - pqrst[i - 1][0]) / (pqrst[i][0] - pqrst[i - 1][0]);
          return pqrst[i - 1][1] + s * (pqrst[i][1] - pqrst[i - 1][1]);
        }
      }
      return 0;
    }

    let lastTime = 0;
    function draw(timestamp) {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;

      // Speed scaled according to BPM slider
      const speed = (bpm / 60) * 0.25;
      offset = (offset + dt * speed) % 1;

      ctx.clearRect(0, 0, W, H);

      // Dark background
      ctx.fillStyle = 'rgba(10, 2, 8, 0.7)';
      ctx.fillRect(0, 0, W, H);

      // Draw Grid lines inside mini monitor
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.1)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Draw Glowing Signal Line
      const BW = W * 0.75;
      const AMP = H * 0.35;
      const cy = H / 2;

      ctx.beginPath();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;

      for (let i = 0; i <= 200; i++) {
        const px = (i / 200) * W;
        const t = ((px / BW) + offset) % 1;
        const py = cy - getSample(t) * AMP;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Leading pulse point
      const leadX = W * 0.7;
      const leadT = ((leadX / BW) + offset) % 1;
      const leadY = cy - getSample(leadT) * AMP;

      ctx.beginPath();
      ctx.arc(leadX, leadY, 4, 0, Math.PI * 2);
      // Sound trigger on cardiac peak
      if (soundEnabled && getSample(leadT) > 1.0) {
        const now = Date.now();
        if (now - lastBeepTime > 300) {
          playHeartBeep();
          lastBeepTime = now;
        }
      }

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);
  }

  function setBPM(newBPM) {
    bpm = Math.max(40, Math.min(newBPM, 200));
    const bpmEl = document.getElementById('bpmDisplay');
    if (bpmEl) bpmEl.textContent = bpm;
  }

  function init() {
    initHeroCanvas();
    initMiniEcg();
  }

  return {
    init,
    setBPM,
    toggleSound
  };
})();
