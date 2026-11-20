(function (global) {
  'use strict';

  const defaults = Object.freeze({
    scene: 'web', color: '#b8c4d4', background: 'transparent', opacity: 1,
    speed: 1, parallax: 1, zoom: 1, perspective: 1, glow: .085, vignette: .63,
    text: 'FRAGMENTS', font: 'monospace', rainSpeed: 1, maxDpr: 1.5,
    maxPixels: 3500000, maxFps: 60, respectReducedMotion: true, params: null
  });
  const bounds = {
    opacity: [0, 1], speed: [0, 10], parallax: [0, 5], zoom: [.1, 5],
    perspective: [.1, 5], glow: [0, 1], vignette: [0, 1], rainSpeed: [.01, 10],
    maxDpr: [.25, 4], maxPixels: [1, 20000000], maxFps: [1, 120]
  };
  const scenes = Object.freeze(/* SCENE_IDS */ []);

  function seeded(n) {
    const value = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
  }

  function alpha(color, opacity) {
    return color + Math.round(255 * opacity).toString(16).padStart(2, '0');
  }

  function create(target, options = {}) {
    const canvas = typeof target === 'string' ? global.document.querySelector(target) : target;
    if (canvas?.localName !== 'canvas') throw new TypeError('Expected a canvas or canvas selector');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is unavailable');
    const view = canvas.ownerDocument.defaultView;
    const media = view.matchMedia('(prefers-reduced-motion: reduce)');
    const custom = new Map();
    const camera = {x: 0, y: 0};
    const pointer = {x: 0, y: 0};
    let prefs = defaults;
    let W = 0, H = 0, projectionScale = 1, time = 0, last = null, frame = null;
    let activeScene, playing = true, destroyed = false;

    function worldWords() {
      return prefs.text.trim() || defaults.text;
    }

    function rainCharacters() {
      return Array.from(worldWords().replace(/\s/g, ''));
    }

    function fontFamily() {
      return prefs.font;
    }

    function path(points) {
      ctx.beginPath();
      points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath();
    }

    // INSERT_DESIGNS

    function choose(scene) {
      if (scene !== 'random') return scene;
      const choices = [...scenes, ...custom.keys()].filter(name => name !== activeScene);
      return choices[Math.floor(Math.random() * choices.length)];
    }

    function paintGradient(x, y, inner, outer, start, end) {
      const gradient = ctx.createRadialGradient(x, y, inner, x, y, outer);
      gradient.addColorStop(0, start);
      gradient.addColorStop(1, end);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);
    }

    function draw(dt) {
      const {width, height} = canvas.getBoundingClientRect();
      W = width;
      H = height;
      if (!W || !H) return;
      projectionScale = prefs.perspective * Math.min(1, H / 500);
      const dpr = Math.min(view.devicePixelRatio || 1, prefs.maxDpr, Math.sqrt(prefs.maxPixels / (W * H)));
      const pixelWidth = Math.max(1, Math.floor(W * dpr));
      const pixelHeight = Math.max(1, Math.floor(H * dpr));
      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;

      const still = prefs.respectReducedMotion && media.matches;
      time += dt * (still ? 0 : prefs.speed);
      const parallax = still ? 0 : prefs.parallax;
      camera.x += (pointer.x * 150 * parallax - camera.x) * Math.min(1, dt * 3);
      camera.y += (pointer.y * 100 * parallax - camera.y) * Math.min(1, dt * 3);
      if (!parallax) camera.x = camera.y = 0;

      const color = prefs.color;
      ctx.save();
      try {
        ctx.setTransform(pixelWidth / W, 0, 0, pixelHeight / H, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = prefs.background;
        ctx.fillRect(0, 0, W, H);
        if (prefs.glow) paintGradient(W * .55, H * .45, 0, Math.max(W, H) * .7, alpha(color, prefs.glow), alpha(color, 0));

        ctx.save();
        try {
          ctx.translate(W / 2, H / 2);
          ctx.scale(prefs.zoom, prefs.zoom);
          ctx.translate(-W / 2, -H / 2);
          const render = custom.get(activeScene);
          if (render) {
            render({ctx, width: W, height: H, time, color, camera: {...camera},
              text: worldWords(), font: prefs.font, params: prefs.params, project: worldPoint, seeded});
          } else {
            backgroundWorlds[activeScene](time, color);
          }
        } finally {
          ctx.restore();
        }

        if (prefs.vignette) paintGradient(W / 2, H / 2, Math.min(W, H) * .16,
          Math.max(W, H) * .65, '#00000000', alpha('#000000', prefs.vignette));
      } finally {
        ctx.restore();
      }
    }

    function needsFrames() {
      return playing && !destroyed && !(prefs.respectReducedMotion && media.matches) &&
        (prefs.speed > 0 || prefs.parallax > 0);
    }

    function tick(now) {
      frame = null;
      const elapsed = last === null ? 0 : now - last;
      if (last === null || elapsed >= 1000 / prefs.maxFps - 1) {
        draw(Math.min(elapsed / 1000, .1));
        last = now;
      }
      if (needsFrames() && frame === null) frame = view.requestAnimationFrame(tick);
    }

    function cancelFrame() {
      if (frame !== null) view.cancelAnimationFrame(frame);
      frame = last = null;
    }

    function refresh() {
      if (destroyed) return;
      if (!needsFrames()) cancelFrame();
      draw(0);
      if (needsFrames() && frame === null) frame = view.requestAnimationFrame(tick);
    }

    function checkActive() {
      if (destroyed) throw new Error('This background has been destroyed');
    }

    function update(patch) {
      checkActive();
      const next = {...prefs, ...patch};
      if (typeof next.color !== 'string' || !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(next.color)) {
        throw new TypeError('color must be a #RGB or #RRGGBB hex value');
      }
      if (next.color.length === 4) next.color = next.color.replace(/[\da-f]/gi, digit => digit + digit);
      for (const [key, [min, max]] of Object.entries(bounds)) {
        if (!Number.isFinite(next[key]) || next[key] < min || next[key] > max) {
          throw new RangeError(key + ' must be between ' + min + ' and ' + max);
        }
      }
      if (next.scene !== 'random' && !scenes.includes(next.scene) && !custom.has(next.scene)) {
        throw new RangeError('Unknown background scene: ' + next.scene);
      }
      for (const key of ['text', 'font', 'background']) {
        if (typeof next[key] !== 'string') throw new TypeError(key + ' must be a string');
      }
      if (!view.CSS.supports('color', next.background)) throw new TypeError('background must be a CSS color');
      if (!activeScene || next.scene !== prefs.scene) {
        activeScene = choose(next.scene);
        time = 0;
      }
      prefs = next;
      canvas.style.opacity = String(prefs.opacity);
      refresh();
    }

    function resetPointer() {
      pointer.x = pointer.y = 0;
    }

    function move(event) {
      if (event.pointerType === 'touch' || !prefs.parallax) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return resetPointer();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return resetPointer();
      pointer.x = x * 2 - 1;
      pointer.y = y * 2 - 1;
    }

    const initialOpacity = canvas.style.opacity;
    update(options);
    const observer = new view.ResizeObserver(refresh);
    observer.observe(canvas);
    const page = canvas.ownerDocument.documentElement;
    page.addEventListener('pointerleave', resetPointer);
    view.addEventListener('resize', refresh);
    view.addEventListener('pointermove', move, {passive: true});
    view.addEventListener('blur', resetPointer);
    media.addEventListener('change', refresh);

    return Object.freeze({
      update,
      get scene() { return activeScene; },
      shuffle() {
        checkActive();
        if (prefs.scene !== 'random') update({scene: 'random'});
        else {
          activeScene = choose('random');
          time = 0;
          refresh();
        }
        return activeScene;
      },
      register(name, render) {
        checkActive();
        if (typeof name !== 'string' || !/^[a-z][a-z0-9-]*$/.test(name) ||
            name === 'random' || scenes.includes(name) || custom.has(name) || typeof render !== 'function') {
          throw new TypeError('Expected a unique scene ID and a render function');
        }
        custom.set(name, render);
      },
      pause() {
        playing = false;
        cancelFrame();
      },
      resume() {
        checkActive();
        playing = true;
        refresh();
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        cancelFrame();
        observer.disconnect();
        page.removeEventListener('pointerleave', resetPointer);
        view.removeEventListener('resize', refresh);
        view.removeEventListener('pointermove', move);
        view.removeEventListener('blur', resetPointer);
        media.removeEventListener('change', refresh);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.opacity = initialOpacity;
      }
    });
  }

  global.FragmentsBackground = Object.freeze({create, scenes, defaults});
})(globalThis);
