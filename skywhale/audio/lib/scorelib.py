"""Score data model: parts, notes, dynamics, and MIDI export for sfizz.

Dynamics for sustained instruments are CC1 (dynamic layer crossfade +
loudness, see sfzgen.py) and CC11 (expression, used for niente swells and
phrase shaping).  For plucked/struck instruments dynamics are velocities.
"""
import math
from collections import defaultdict

from .smf import MidiTrack

DYN = {"niente": 0, "pppp": 6, "ppp": 14, "pp": 26, "p": 40, "mp": 56, "mf": 74, "f": 92, "ff": 108, "fff": 122}

NOTE_NAMES = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def P(name):
    """Pitch name -> MIDI number (scientific pitch, C4 = 60).
    'D4', 'F#5', 'Bb3'."""
    letter = name[0].upper()
    rest = name[1:]
    acc = 0
    while rest and rest[0] in "#b":
        acc += 1 if rest[0] == "#" else -1
        rest = rest[1:]
    octave = int(rest)
    return 12 * (octave + 1) + NOTE_NAMES[letter] + acc


def dyn(v):
    return DYN[v] if isinstance(v, str) else int(v)


class Part:
    def __init__(self, name, instrument, pan=0.0, gain_db=0.0, width=0.7, kind="sustain",
                 cc1_default="mp", cc11_default=127):
        self.name = name
        self.instrument = instrument
        self.pan = pan
        self.gain_db = gain_db
        self.width = width
        self.kind = kind  # 'sustain' | 'perc' | 'piano'
        self.notes = []  # (t_on, t_off, key, vel)
        # num -> [(t, value, mode)]; mode 'step' jumps to value at t (the
        # previous value is held until then), 'lin' ramps linearly from the
        # previous point.  Values hold flat between events.
        self.cc = defaultdict(list)
        self.cc_steps = defaultdict(list)  # num -> [(t, value)] instantaneous
        self.cc1_default = dyn(cc1_default)
        self.cc11_default = cc11_default

    # -------- notes
    def note(self, t, dur, pitch, vel=64):
        key = P(pitch) if isinstance(pitch, str) else int(pitch)
        self.notes.append((float(t), float(t + dur), key, dyn(vel) if isinstance(vel, str) else vel))
        return self

    def chord(self, t, dur, pitches, vel=64):
        for p in pitches:
            self.note(t, dur, p, vel)
        return self

    # -------- controllers
    @staticmethod
    def _v(v):
        return float(dyn(v) if isinstance(v, str) else v)

    def ramp(self, num, t0, v0, t1, v1):
        """Jump to v0 at t0, then ramp linearly to v1 at t1."""
        self.cc[num].append((float(t0), self._v(v0), "step"))
        self.cc[num].append((float(t1), self._v(v1), "lin"))
        return self

    def hold(self, num, t, v):
        """Set a controller value from time t on."""
        self.cc[num].append((float(t), self._v(v), "step"))
        return self

    def dyn_at(self, t, d):
        return self.hold(1, t, d)

    def hairpin(self, t0, d0, t1, d1):
        return self.ramp(1, t0, d0, t1, d1)

    def expr(self, t0, v0, t1, v1):
        return self.ramp(11, t0, v0, t1, v1)

    def niente_in(self, t0, t1):
        """Swell from silence (CC11 0 -> 127, sine-shaped)."""
        n = 12
        for i in range(n + 1):
            u = i / n
            self.cc[11].append((t0 + (t1 - t0) * u, 127 * math.sin(0.5 * math.pi * u), "step" if i == 0 else "lin"))
        return self

    def niente_out(self, t0, t1):
        n = 12
        for i in range(n + 1):
            u = i / n
            self.cc[11].append((t0 + (t1 - t0) * u, 127 * math.cos(0.5 * math.pi * u), "step" if i == 0 else "lin"))
        return self

    def pedal(self, t_down, t_up):
        self.cc_steps[64].append((float(t_down), 127))
        self.cc_steps[64].append((float(t_up), 0))
        return self

    # -------- export
    def cc_points(self, num, initial=None):
        """Resolve step/lin breakpoints into a piecewise-linear curve."""
        pts = sorted(self.cc[num], key=lambda p: p[0])  # stable: keeps insertion order on ties
        cur_t, cur_v = 0.0, (initial if initial is not None else (self.cc1_default if num == 1 else self.cc11_default))
        out = [(0.0, cur_v)]
        for t, v, mode in pts:
            if mode == "step":
                out.append((t, cur_v))  # hold previous value up to t
                out.append((t, v))
            else:
                out.append((t, v))
            cur_t, cur_v = t, v
        return out

    def cc_value(self, num, t):
        pts = self.cc_points(num)
        v = pts[0][1]
        for (t0, v0), (t1, v1) in zip(pts, pts[1:]):
            if t0 <= t <= t1:
                return v0 if t1 <= t0 + 1e-12 else v0 + (v1 - v0) * (t - t0) / (t1 - t0)
            if t > t1:
                v = v1
        return v

    def _cc_curve_events(self, num, step=0.01):
        pts = self.cc_points(num)
        ev = []
        for (t0, v0), (t1, v1) in zip(pts, pts[1:]):
            if t1 <= t0 + 1e-9:
                ev.append((t1, v1))
                continue
            n = max(1, int(math.ceil((t1 - t0) / step)))
            for i in range(n):
                ev.append((t0 + (t1 - t0) * i / n, v0 + (v1 - v0) * i / n))
        ev.append(pts[-1])
        # drop repeated values
        out = []
        last = None
        for t, v in ev:
            iv = int(round(max(0, min(127, v))))
            if iv != last:
                out.append((t, iv))
                last = iv
        return out

    def to_midi(self, path):
        m = MidiTrack()
        if self.kind == "sustain":
            m.cc(0.0, 1, self.cc1_default)
            m.cc(0.0, 11, self.cc11_default)
        else:
            m.cc(0.0, 11, self.cc11_default)
        for num in self.cc:
            for t, v in self._cc_curve_events(num):
                m.cc(max(0.0, t), num, v)
        for num, pts in self.cc_steps.items():
            for t, v in pts:
                m.cc(max(0.0, t), num, v)
        for t0, t1, key, vel in self.resolved_notes():
            m.note(t0, t1, key, vel)
        m.write(path)

    def resolved_notes(self):
        """Notes with same-key overlaps removed: sfizz releases every voice
        of a key on note-off, so a re-attack of the same pitch must not
        start before the previous note's note-off.  The earlier note is
        cut at the re-attack; its release tail (ampeg_release) overlaps the
        new attack like a bow change."""
        out = []
        by_key = {}
        for n in sorted(self.notes, key=lambda n: (n[2], n[0])):
            by_key.setdefault(n[2], []).append(list(n))
        for key, ns in by_key.items():
            for a, b in zip(ns, ns[1:]):
                if b[0] < a[1]:
                    a[1] = b[0]
            out.extend(tuple(n) for n in ns if n[1] > n[0])
        return sorted(out)

    def span(self):
        if not self.notes:
            return None
        return min(n[0] for n in self.notes), max(n[1] for n in self.notes)


class Score:
    def __init__(self):
        self.parts = {}
        self.tempo_maps = []
        self.notes_doc = []  # human-readable log lines

    def part(self, name, instrument, **kw):
        if name not in self.parts:
            self.parts[name] = Part(name, instrument, **kw)
        return self.parts[name]

    def doc(self, line):
        self.notes_doc.append(line)

    def active_voices(self, t):
        """Number of parts sounding at time t (for the 3-4 voice check)."""
        n = 0
        for p in self.parts.values():
            if any(a <= t < b for a, b, _, _ in p.resolved_notes()):
                n += 1
        return n
