import React, { useEffect, useRef, useState } from "react";

export default function IntroScreen({ onFinish }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const copyRef = useRef(null);
  const wipeRef = useRef(null);
  const hintRef = useRef(null);
  const [phase, setPhase] = useState("run");

  useEffect(() => {
    const cv = canvasRef.current;
    const container = containerRef.current;
    if (!cv || !container) return;
    const ctx = cv.getContext("2d");
    let animId;

    const TAU = Math.PI * 2;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
    const easeOutBack = (x) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    };

    let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, R = 68, particles = [];

    function layout() {
      DPR = Math.min(2, window.devicePixelRatio || 1);
      const rect = container.getBoundingClientRect();
      W = rect.width || 400;
      H = rect.height || 750;
      cv.width = Math.round(W * DPR);
      cv.height = Math.round(H * DPR);

      // Scaled nicely for the mobile view
      R = Math.max(48, Math.min(W * 0.22, H * 0.15));
      cx = W / 2;
      cy = H * 0.38;

      if (copyRef.current) {
        copyRef.current.style.top = `${cy + R * 1.5}px`;
      }

      particles = Array.from({ length: 45 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.5 + 0.5,
        p: Math.random() * TAU,
        s: 0.8 + Math.random() * 1.5,
      }));
    }

    layout();
    window.addEventListener("resize", layout);

    // 3D Faceted Orb geometry
    const norm = (v) => {
      const l = Math.hypot(v[0], v[1], v[2]) || 1;
      return [v[0] / l, v[1] / l, v[2] / l];
    };

    function icosphere(sub) {
      const t = (1 + Math.sqrt(5)) / 2;
      const v = [
        [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
        [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
        [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
      ].map(norm);
      let f = [
        [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
        [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
        [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
        [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
      ];
      for (let s = 0; s < sub; s++) {
        const cache = {};
        const mid = (a, b) => {
          const k = a < b ? `${a}_${b}` : `${b}_${a}`;
          if (cache[k] !== undefined) return cache[k];
          v.push(norm([(v[a][0] + v[b][0]) / 2, (v[a][1] + v[b][1]) / 2, (v[a][2] + v[b][2]) / 2]));
          return (cache[k] = v.length - 1);
        };
        const nf = [];
        for (const [a, b, c] of f) {
          const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
          nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
        }
        f = nf;
      }
      return { v, f };
    }

    const ico = icosphere(2);
    const VERTS = ico.v.map((p) => {
      const k = 1 + (Math.random() - 0.5) * 0.08;
      return [p[0] * k, p[1] * k, p[2] * k];
    });

    const FACES = ico.f.map(([a, b, c]) => {
      const A = VERTS[a], B = VERTS[b], C = VERTS[c];
      const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]],
            w = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
      let n = norm([
        u[1] * w[2] - u[2] * w[1],
        u[2] * w[0] - u[0] * w[2],
        u[0] * w[1] - u[1] * w[0],
      ]);
      const cen = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3, (A[2] + B[2] + C[2]) / 3];
      if (n[0] * cen[0] + n[1] * cen[1] + n[2] * cen[2] < 0) n = [-n[0], -n[1], -n[2]];
      return { a, b, c, n, ph: Math.random() * TAU };
    });

    function rot(p, ry, rx) {
      const x = p[0] * Math.cos(ry) + p[2] * Math.sin(ry),
            z = -p[0] * Math.sin(ry) + p[2] * Math.cos(ry),
            y = p[1];
      return [x, y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
    }

    const LIGHT = norm([-0.4, -0.6, 0.7]);
    // Rich, vibrant color ramp for a bright/white background
    const STOPS = [
      [0, 31, 93, 76],      // Brand deep emerald
      [0.28, 62, 111, 224], // Protein vibrant blue
      [0.55, 232, 162, 61], // Warm carbs amber
      [0.78, 255, 107, 71], // Signature vibrant coral
      [1, 255, 185, 95],    // Radiant gold
    ];

    function ramp(e) {
      e = clamp(e, 0, 1);
      for (let i = 1; i < STOPS.length; i++) {
        if (e <= STOPS[i][0]) {
          const a = STOPS[i - 1], b = STOPS[i], k = (e - a[0]) / (b[0] - a[0]);
          return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k];
        }
      }
      return [255, 185, 95];
    }

    // Flame ribbons
    const RIB = Array.from({ length: 7 }, (_, i) => ({
      tx: (Math.random() - 0.5) * 2.2,
      tz: Math.random() * Math.PI,
      ph: Math.random() * TAU,
      acc: 0,
      sp: (0.45 + Math.random() * 0.55) * (i % 2 ? 1 : -1),
      len: 1.3 + Math.random() * 1.2,
      lift: 0.12 + Math.random() * 0.2,
      wm: 0.75 + Math.random() * 0.5,
      wob: 1 + Math.random() * 2,
      seed: Math.random() * 100,
    }));
    const NSEG = 26;

    function flameCol(u) {
      if (u < 0.5) {
        const k = u / 0.5;
        return [255, 140 - 30 * k, 70 - 10 * k];
      }
      const k = (u - 0.5) / 0.5;
      return [255 - 40 * k, 110 - 20 * k, 60 + 20 * k];
    }

    // Embers
    const em = [];
    let emAcc = 0;

    function spawnBurst() {
      for (let i = 0; i < 160; i++) {
        const a = Math.random() * TAU,
              sp = (220 + Math.random() * 700) * (R / 90);
        em.push({
          x: cx, y: cy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0,
          max: 0.55 + Math.random() * 0.75,
          s: 1.2 + Math.random() * 2.4,
          d: 2.1,
          tw: Math.random() * TAU,
        });
      }
    }

    const view = { px: 0, py: 0, tpx: 0, tpy: 0 };
    const onPointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      view.tpx = (e.clientX - rect.left) / W - 0.5;
      view.tpy = (e.clientY - rect.top) / H - 0.5;
    };
    container.addEventListener("pointermove", onPointerMove);

    let currentPhase = "run";
    let tClick = 0, tBurst = 0, spin = 0;
    const start = performance.now();
    let last = start;

    function doBurst() {
      currentPhase = "burst";
      setPhase("burst");
      tBurst = performance.now();
      spawnBurst();

      if (copyRef.current) copyRef.current.classList.add("out");

      const w = wipeRef.current;
      if (w) {
        w.style.left = `${cx}px`;
        w.style.top = `${cy}px`;
        const scale = (Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) / 30) * 1.15;
        w.animate(
          [
            { transform: "translate(-50%,-50%) scale(0)", opacity: 0.9 },
            { transform: `translate(-50%,-50%) scale(${scale})`, opacity: 1 },
          ],
          { duration: 500, delay: 50, easing: "cubic-bezier(.55,0,.25,1)", fill: "forwards" }
        );
      }

      setTimeout(() => {
        if (onFinish) onFinish();
      }, 550);
    }

    function trigger() {
      if (currentPhase !== "run") return;
      currentPhase = "charge";
      setPhase("charge");
      tClick = performance.now();
      if (hintRef.current) hintRef.current.classList.add("out");
      try {
        if (navigator.vibrate) navigator.vibrate(20);
      } catch (e) {}
    }

    // Auto-advance after 2.8s
    const autoAdvanceTimer = setTimeout(() => {
      if (currentPhase === "run") trigger();
    }, 2800);

    const onKeyDown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        trigger();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    container.onclick = trigger;

    function frame(now) {
      animId = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = ((now - start) / 1000) * 2.0; // Fast 1-second entrance

      view.px += (view.tpx - view.px) * Math.min(1, dt * 5);
      view.py += (view.tpy - view.py) * Math.min(1, dt * 5);

      let sc = 0.04 + 0.96 * easeOutBack(Math.min(1, t / 1.0));
      const alpha = Math.min(1, t / 0.3);
      let gm = easeOutCubic(Math.min(1, t / 1.4)) * (0.92 + 0.08 * Math.sin(t * 1.8));
      const rg = easeOutCubic(clamp((t - 0.2) / 1.0, 0, 1));

      let spd = 1, lift = 1, heat = 0, jx = 0, jy = 0, fade = 1, b = -1, charge = 0;

      if (currentPhase === "run") sc *= 1 + 0.012 * Math.sin(t * 1.6);
      if (currentPhase === "charge") {
        const c = Math.min(1, ((now - tClick) / 1000) / 0.35); // 350ms snappy charge
        const e = c * c * (3 - 2 * c);
        charge = e;
        sc *= 1 - 0.12 * e;
        gm += 1.8 * e;
        spd = 1 + 4.0 * e;
        heat = 0.35 * e;
        lift = 1 - 0.5 * e;
        jx = (Math.random() - 0.5) * R * 0.02 * e;
        jy = (Math.random() - 0.5) * R * 0.02 * e;
        if (c >= 1) doBurst();
      }
      if (currentPhase === "burst") {
        b = (now - tBurst) / 1000;
        sc *= 0.87 + 0.6 * easeOutCubic(Math.min(1, b / 0.4));
        gm = 1 + 2.2 * (1 - clamp(b / 0.6, 0, 1));
        heat = 0.4 * (1 - clamp(b / 0.4, 0, 1));
        lift = 1 + 4 * b;
        spd = 3.2;
        fade = 1 - clamp(b / 0.45, 0, 1);
      }

      spin += dt * 0.35 * (1 + (spd - 1) * 0.8);
      const ry = spin + view.px * 0.55,
            rx = -0.2 + view.py * 0.3;
      const S = R * sc,
            ox = cx + jx,
            oy = cy + jy;

      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      // Subtle light warm ambient particles on white
      const sf = clamp(t / 0.7, 0, 1) * (currentPhase === "burst" ? fade : 1);
      for (const p of particles) {
        ctx.fillStyle = `rgba(255,107,71,${(0.1 + 0.25 * (0.5 + 0.5 * Math.sin(t * p.s + p.p))) * sf})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
      }

      // Soft warm radial shadows under the orb for high depth on white
      let g = ctx.createRadialGradient(ox, oy, S * 0.4, ox, oy, S * 2.2);
      g.addColorStop(0, `rgba(255,107,71,${clamp(0.22 * gm, 0, 0.4)})`);
      g.addColorStop(0.5, `rgba(228,238,233,${clamp(0.4 * gm, 0, 0.6)})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // Flame ribbons behind orb
      const back = [], front = [];
      const W0 = R * 0.08 * sc,
            vy = view.px * 0.55,
            vp = -0.2 + view.py * 0.3;
      const ribAlpha = alpha * (currentPhase === "burst" ? fade : 1);

      if (ribAlpha > 0.01) {
        for (const r of RIB) {
          r.acc += r.sp * dt * spd;
          const len = r.len * rg;
          if (len < 0.05) continue;
          const dir = r.sp > 0 ? 1 : -1,
                base = r.ph + r.acc;
          let prev = null;
          for (let k = 0; k <= NSEG; k++) {
            const u = k / NSEG,
                  a = base - dir * u * len;
            const rr = 1.02 + r.lift * lift * Math.pow(u, 1.15) * (0.75 + 0.25 * Math.sin(t * 2.2 + r.seed + u * 5)) + 0.02 * Math.sin(u * r.wob * 7 + t * 3 + r.seed);
            const x = Math.cos(a) * rr,
                  y = Math.sin(a) * rr;
            const y1 = y * Math.cos(r.tx),
                  z1 = y * Math.sin(r.tx);
            const x2 = x * Math.cos(r.tz) - y1 * Math.sin(r.tz),
                  y2 = x * Math.sin(r.tz) + y1 * Math.cos(r.tz);
            const p = rot([x2, y2, z1], vy, vp);
            const cur = { x: ox + p[0] * S, y: oy + p[1] * S, z: p[2], u };
            if (prev) {
              const um = (prev.u + cur.u) / 2,
                    c = flameCol(um);
              const w = W0 * r.wm * Math.pow(Math.sin(Math.PI * Math.min(1, um * 0.86 + 0.07)), 0.85) * (0.8 + 0.2 * Math.sin(t * 5 + r.seed + um * 9));
              (prev.z + cur.z > 0 ? front : back).push({
                x1: prev.x, y1: prev.y, x2: cur.x, y2: cur.y,
                w, c, a: (1 - um * 0.45) * ribAlpha * 0.9,
              });
            }
            prev = cur;
          }
        }
      }

      const drawSegs = (list) => {
        for (const s of list) {
          ctx.beginPath();
          ctx.moveTo(s.x1, s.y1);
          ctx.lineTo(s.x2, s.y2);
          ctx.strokeStyle = `rgba(${s.c[0] | 0},${s.c[1] | 0},${s.c[2] | 0},${s.a * 0.28})`;
          ctx.lineWidth = s.w * 2.2;
          ctx.stroke();
          ctx.strokeStyle = `rgba(${s.c[0] | 0},${s.c[1] | 0},${s.c[2] | 0},${s.a})`;
          ctx.lineWidth = Math.max(0.8, s.w);
          ctx.stroke();
        }
      };
      drawSegs(back);

      // Orb body
      const orbA = alpha * fade;
      if (orbA > 0.01) {
        ctx.globalAlpha = orbA;
        const rv = VERTS.map((v) => rot(v, ry, rx));
        const vis = [];
        for (const f of FACES) {
          const z = (rv[f.a][2] + rv[f.b][2] + rv[f.c][2]) / 3;
          if (z < -0.3) continue;
          vis.push({ f, z, n: rot(f.n, ry, rx) });
        }
        vis.sort((p, q) => p.z - q.z);
        for (const { f, n } of vis) {
          const I = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
          const rim = 1 - Math.max(0, n[2]);
          const e = 0.12 + I * 0.74 + rim * 0.12 + (0.08 * Math.sin(t * 1.9 + f.ph) + 0.02) + heat;
          const c = ramp(e),
                col = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
          const A = rv[f.a], B = rv[f.b], C = rv[f.c];
          ctx.beginPath();
          ctx.moveTo(ox + A[0] * S, oy + A[1] * S);
          ctx.lineTo(ox + B[0] * S, oy + B[1] * S);
          ctx.lineTo(ox + C[0] * S, oy + C[1] * S);
          ctx.closePath();
          ctx.fillStyle = col;
          ctx.strokeStyle = "rgba(255,255,255,0.4)";
          ctx.lineWidth = 0.7;
          ctx.fill();
          ctx.stroke();
        }

        // Vibrant highlight and crystal core
        g = ctx.createRadialGradient(ox - S * 0.25, oy - S * 0.3, 0, ox - S * 0.25, oy - S * 0.3, S * 1.1);
        g.addColorStop(0, `rgba(255,220,120,${0.35 + 0.25 * heat})`);
        g.addColorStop(0.6, "rgba(255,107,71,0.15)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ox, oy, S * 1.01, 0, TAU);
        ctx.fill();

        ctx.globalAlpha = 1;
      }

      drawSegs(front);

      // Golden halo
      if (orbA > 0.01) {
        const hy = oy - S * 1.22 + Math.sin(t * 1.4) * 2;
        ctx.save();
        ctx.globalAlpha = orbA * 0.9 * (1 - charge);
        ctx.strokeStyle = "rgba(255,107,71,0.85)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(ox, hy, S * 0.32, S * 0.06, 0, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      // Embers floating upward
      const ready = clamp((t - 0.3) / 0.8, 0, 1);
      if (currentPhase !== "burst") {
        emAcc += dt * (32 * ready + (currentPhase === "charge" ? 140 * charge : 0));
        while (emAcc >= 1 && em.length < 240) {
          emAcc--;
          const a = Math.random() * TAU,
                rad = S * (0.9 + Math.random() * 0.45);
          em.push({
            x: ox + Math.cos(a) * rad,
            y: oy + Math.sin(a) * rad,
            vx: (Math.random() - 0.5) * 22 + Math.cos(a) * 12,
            vy: -(22 + Math.random() * 55) * (R / 90) + Math.sin(a) * 8,
            life: 0,
            max: 1.1 + Math.random() * 1.5,
            s: 0.8 + Math.random() * 1.8,
            d: 0,
            tw: Math.random() * TAU,
          });
        }
      }
      for (let i = em.length - 1; i >= 0; i--) {
        const p = em[i];
        p.life += dt;
        if (p.life >= p.max) {
          em.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.d) {
          const k = Math.max(0, 1 - p.d * dt);
          p.vx *= k;
          p.vy *= k;
        } else {
          p.vx += Math.sin(p.life * 3 + p.tw) * 7 * dt;
        }
        const a = Math.sin((Math.PI * p.life) / p.max) * (0.65 + 0.35 * Math.sin(t * 8 + p.tw));
        ctx.fillStyle = `rgba(255,107,71,${a * 0.8})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, TAU);
        ctx.fill();
      }

      // Burst shockwaves
      if (currentPhase === "burst") {
        for (let i = 0; i < 2; i++) {
          const bb = (b - i * 0.1) / 0.8;
          if (bb > 0 && bb < 1) {
            ctx.strokeStyle = `rgba(255,107,71,${(1 - bb) * 0.8})`;
            ctx.lineWidth = 6 * (1 - bb) + 1;
            ctx.beginPath();
            ctx.arc(cx, cy, R * (1 + 8 * easeOutCubic(bb)), 0, TAU);
            ctx.stroke();
          }
        }
      } else if (currentPhase === "run" && t > 1.8) {
        const w = ((t - 1.8) % 2.4) / 2.4;
        ctx.strokeStyle = `rgba(255,107,71,${0.28 * (1 - w)})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(ox, oy, S * (1.06 + 0.4 * w), 0, TAU);
        ctx.stroke();
      }
    }

    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(autoAdvanceTimer);
      window.removeEventListener("resize", layout);
      container.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onFinish]);

  return (
    <div className="np-intro-mobile-frame" ref={containerRef}>
      <style>{`
        .np-intro-mobile-frame{
          position:absolute;
          inset:0;
          z-index:40;
          overflow:hidden;
          background:#FFFFFF;
          border-radius:inherit;
          user-select:none;
          cursor:pointer;
          font-family:'Inter',sans-serif;
          color:#1C2B24;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
        }
        #np-mobile-fx{
          position:absolute;
          inset:0;
          width:100%;
          height:100%;
          display:block;
        }
        .np-intro-skip-btn{
          position:absolute;
          top:18px;
          right:16px;
          z-index:45;
          background:rgba(28,43,36,0.06);
          border:1px solid rgba(28,43,36,0.12);
          color:#6E7B73;
          font-size:11.5px;
          font-weight:700;
          padding:5px 12px;
          border-radius:16px;
          cursor:pointer;
          backdrop-filter:blur(6px);
          transition:all .15s;
        }
        .np-intro-skip-btn:hover{
          background:rgba(28,43,36,0.12);
          color:#1C2B24;
        }
        .np-intro-text-block{
          position:absolute;
          left:0;
          right:0;
          top:56%;
          text-align:center;
          pointer-events:none;
          transition:opacity .45s ease, transform .6s ease;
        }
        .np-intro-text-block.out{
          opacity:0;
          transform:scale(1.08);
        }
        .np-intro-subheading{
          font-size:12px;
          font-weight:700;
          letter-spacing:0.12em;
          text-transform:uppercase;
          color:#6E7B73;
          margin-bottom:8px;
          opacity:0;
          transform:translateY(6px);
          animation:npFadeUp .5s ease forwards .15s;
        }
        .np-intro-heading-word{
          font-family:'Oswald',sans-serif;
          font-weight:700;
          font-size:38px;
          letter-spacing:0.3px;
          color:#1C2B24;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          opacity:0;
          transform:translateY(10px);
          animation:npFadeUp .6s cubic-bezier(.2,.8,.2,1) forwards .25s;
        }
        .np-intro-dot{
          width:11px;
          height:11px;
          border-radius:50%;
          background:#FF6B47;
          display:inline-block;
          box-shadow:0 0 12px rgba(255,107,71,0.6);
        }
        @keyframes npFadeUp{
          to{ opacity:1; transform:none; }
        }
        .np-intro-action-hint{
          position:absolute;
          left:0;
          right:0;
          bottom:32px;
          text-align:center;
          font-size:12.5px;
          font-weight:600;
          color:#9CA69E;
          pointer-events:none;
          opacity:0;
          animation:npHintShow .6s ease forwards .7s, npBreatheLight 2.2s ease-in-out infinite 1.2s;
        }
        .np-intro-action-hint.out{
          opacity:0;
          transition:opacity .2s;
        }
        @keyframes npHintShow{ to{ opacity:0.85; } }
        @keyframes npBreatheLight{
          0%,100%{ opacity:0.6; transform:scale(0.98); }
          50%{ opacity:1; transform:scale(1.02); }
        }
        .np-intro-white-wipe{
          position:absolute;
          left:0;
          top:0;
          width:50px;
          height:50px;
          border-radius:50%;
          background:#FBFAF6;
          z-index:50;
          pointer-events:none;
          transform:translate(-50%,-50%) scale(0);
          box-shadow:0 0 40px 14px rgba(255,107,71,0.7), 0 0 100px 35px rgba(228,238,233,0.9);
        }
      `}</style>

      <canvas id="np-mobile-fx" ref={canvasRef} aria-hidden="true" />

      <button
        className="np-intro-skip-btn"
        onClick={(e) => {
          e.stopPropagation();
          onFinish();
        }}
      >
        Skip &rarr;
      </button>

      <div className="np-intro-text-block" ref={copyRef}>
        <div className="np-intro-subheading">Welcome to</div>
        <div className="np-intro-heading-word">
          <span className="np-intro-dot" />
          JazzMacros
        </div>
      </div>

      <div className="np-intro-action-hint" ref={hintRef}>
        Tap to begin
      </div>

      <div className="np-intro-white-wipe" ref={wipeRef} />
    </div>
  );
}
