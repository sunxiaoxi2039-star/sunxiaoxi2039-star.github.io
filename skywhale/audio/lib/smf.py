"""Minimal Standard MIDI File (format 0) writer.

Times are given in seconds and written with a resolution of exactly one
sample at 48 kHz: PPQ = 30000 ticks per quarter and a fixed tempo of
625000 us per quarter give 1 tick = 20.8333 us = 1/48000 s.  The musical
tempo map lives in the score (lib/tempo.py); the MIDI file is only a
sample-accurate transport into sfizz_render.
"""
import struct

SR = 48000
PPQ = 30000
TEMPO_US = 625000  # 30000 ticks per 0.625 s -> 48000 ticks per second


def _vlq(n):
    n = int(n)
    out = [n & 0x7F]
    n >>= 7
    while n:
        out.append((n & 0x7F) | 0x80)
        n >>= 7
    return bytes(reversed(out))


def sec_to_tick(t):
    return int(round(t * SR))


class MidiTrack:
    def __init__(self):
        self.events = []  # (tick, order, bytes)

    def note(self, t_on, t_off, key, vel, ch=0):
        key = int(key); vel = max(1, min(127, int(round(vel))))
        a, b = sec_to_tick(t_on), sec_to_tick(t_off)
        if b <= a:
            b = a + 1
        self.events.append((a, 2, bytes([0x90 | ch, key, vel])))
        # note-offs sort before note-ons on the same tick (order 1 < 2)
        self.events.append((b, 1, bytes([0x80 | ch, key, 0])))

    def cc(self, t, num, val, ch=0):
        val = max(0, min(127, int(round(val))))
        self.events.append((sec_to_tick(t), 0, bytes([0xB0 | ch, int(num), val])))

    def write(self, path):
        evs = sorted(self.events, key=lambda e: (e[0], e[1]))
        body = bytearray()
        # tempo meta at t=0
        body += _vlq(0) + bytes([0xFF, 0x51, 0x03]) + TEMPO_US.to_bytes(3, "big")
        last = 0
        for tick, _, data in evs:
            body += _vlq(tick - last) + data
            last = tick
        body += _vlq(0) + bytes([0xFF, 0x2F, 0x00])
        with open(path, "wb") as f:
            f.write(b"MThd" + struct.pack(">IHHH", 6, 0, 1, PPQ))
            f.write(b"MTrk" + struct.pack(">I", len(body)) + bytes(body))
