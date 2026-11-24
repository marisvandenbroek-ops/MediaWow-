"""Bouwt de soundtrack van de reel.

1. Intro (0-2,3 s): hi-hats op ~130 BPM, fingersnaps, een riser en een 808-drop op 12:00.
2. Vanaf de drop: audio/<TRACK> (gegenereerde house, ~129 BPM),
   met één maat eruit geknipt zodat de slotklap op de eindkaart valt.

Uitvoer: audio/mix.wav. Vereist numpy en ffmpeg.
Gebruik: python3 build_audio.py
"""
import math
import os
import subprocess
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
DROP = 2.3   # moment waarop de klok op 12:00 staat (zie reel.html)
END = 19.4   # lengte van de uiteindelijke video
TRACK = 'house-gritty.mp3'  # ruige house; 'house.mp3' is de rustigere deep-house-variant
rng = np.random.default_rng(11)


def biquad(x, f0, q, typ):
    w = 2 * math.pi * f0 / SR
    a = math.sin(w) / (2 * q)
    c = math.cos(w)
    b = {'lp': [(1 - c) / 2, 1 - c, (1 - c) / 2], 'bp': [a, 0, -a],
         'hp': [(1 + c) / 2, -(1 + c), (1 + c) / 2]}[typ]
    A = [1 + a, -2 * c, 1 - a]
    b = [v / A[0] for v in b]
    A = [v / A[0] for v in A]
    y = np.zeros_like(x)
    x1 = x2 = y1 = y2 = 0.0
    for i, v in enumerate(x):
        r = b[0] * v + b[1] * x1 + b[2] * x2 - A[1] * y1 - A[2] * y2
        x2, x1, y2, y1 = x1, v, y1, r
        y[i] = r
    return y


def intro():
    n_tot = int(SR * END)
    L, R = np.zeros(n_tot), np.zeros(n_tot)
    beat = 0.46
    eighth = beat / 2

    def add(sig, t, g=1.0, pan=0.0):
        i = int(t * SR)
        j = min(n_tot, i + len(sig))
        s = sig[:j - i] * g
        L[i:j] += s * (1 - max(0, pan))
        R[i:j] += s * (1 + min(0, pan))

    def hat(open_=False):
        n = int(SR * (0.18 if open_ else 0.05))
        x = np.arange(n) / SR
        return biquad(rng.standard_normal(n), 8000, 0.8, 'hp') * np.exp(-x * (18 if open_ else 90))

    def snap():
        n = int(SR * 0.16)
        x = np.arange(n) / SR
        s = biquad(rng.standard_normal(n), 1900, 2.2, 'bp')
        env = np.zeros(n)
        for o in (0, 0.008, 0.017):
            k = int(o * SR)
            env[k:] += np.exp(-x[:n - k] * 55)
        return s * env

    def kick808():
        n = int(SR * 1.6)
        x = np.arange(n) / SR
        f = 48 + 75 * np.exp(-x * 28)
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 2.2)
        s = np.tanh(2.2 * s) / np.tanh(2.2)
        return s + biquad(rng.standard_normal(n), 3000, 1, 'bp') * np.exp(-x * 400) * 0.25

    for k in range(int(DROP / eighth)):
        off = k % 2 == 1
        add(hat(open_=off), k * eighth + (0.012 if off else 0), 0.28 if off else 0.22, 0.25 if off else -0.25)
    for t in (beat, beat * 3):
        add(snap(), t, 0.55)
    # riser: ruis met stijgend bandfilter, valt 40 ms voor de drop weg
    r0 = 0.7
    n = int(SR * (DROP - 0.04 - r0))
    x = np.arange(n) / SR
    noise = rng.standard_normal(n)
    seg = np.zeros(n)
    blk = 1200
    for i in range(0, n, blk):
        seg[i:i + blk] = biquad(noise[i:i + blk], 400 * (8000 / 400) ** (i / n), 1.2, 'bp')
    add(seg * (x / x[-1]) ** 2, r0, 0.35)
    add(kick808(), DROP, 0.95)
    add(snap(), DROP, 0.6)
    add(hat(True), DROP, 0.25)
    out = np.stack([L, R], 1)
    return out / (np.max(np.abs(out)) * 1.12)


def load_track():
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(HERE, 'audio', TRACK),
                          '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def main():
    n_tot = int(SR * END)
    m = load_track()
    beat, t0 = 0.4644, 0.012  # gemeten tempo en eerste tel (gelijk voor beide tracks)
    # één maat (tel 16-20) eruit, met 15 ms crossfade
    a = int((t0 + 16 * beat - 0.01) * SR)
    b = int((t0 + 20 * beat - 0.01) * SR)
    xf = int(0.015 * SR)
    fade = np.linspace(0, 1, xf)[:, None]
    head, tail = m[:a].copy(), m[b:].copy()
    head[-xf:] = head[-xf:] * (1 - fade) + tail[:xf] * fade
    mus = np.concatenate([head, tail[xf:]])

    out = np.zeros((n_tot, 2))
    iv = intro()
    iv[int(DROP * SR):] *= 0.6   # 808 iets terug zodat de track het overneemt
    out += iv * 0.9
    st = int((DROP - t0) * SR)
    seg = mus[:n_tot - st].copy()
    seg[:240] *= np.linspace(0, 1, 240)[:, None]
    out[st:st + len(seg)] += seg * 0.85
    fo = int(0.4 * SR)
    out[-fo:] *= np.linspace(1, 0, fo)[:, None]
    out /= np.max(np.abs(out)) / 0.89

    path = os.path.join(HERE, 'audio', 'mix.wav')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((out * 32767).astype(np.int16).tobytes())
    print('Geschreven:', path)


if __name__ == '__main__':
    main()
