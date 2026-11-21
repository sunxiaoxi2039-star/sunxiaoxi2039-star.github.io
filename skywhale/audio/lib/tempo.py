"""Tempo maps for the score.

A movement's tempo map is a list of anchors (beat, time).  Times may be
plain seconds or references to timeline cues, so the music stretches when
a cue moves.  Between anchors the tempo is constant (piecewise-linear
beat -> time), which gives the score its rubato: each segment's tempo is
reported by describe().
"""


class TempoMap:
    def __init__(self, name, anchors, timeline=None):
        """anchors: list of (beat, when).  `when` is seconds (float) or a
        tuple (cue_id, offset_seconds)."""
        self.name = name
        pts = []
        for beat, when in anchors:
            if isinstance(when, tuple):
                cue_id, off = when
                t = timeline.t(cue_id) + off
            else:
                t = float(when)
            pts.append((float(beat), t))
        pts.sort()
        for (b0, t0), (b1, t1) in zip(pts, pts[1:]):
            if not (b1 > b0 and t1 > t0):
                raise ValueError(f"tempo map {name}: anchors must increase: {(b0, t0)} {(b1, t1)}")
        self.pts = pts

    def time(self, beat):
        p = self.pts
        if beat <= p[0][0]:
            (b0, t0), (b1, t1) = p[0], p[1]
        elif beat >= p[-1][0]:
            (b0, t0), (b1, t1) = p[-2], p[-1]
        else:
            for (b0, t0), (b1, t1) in zip(p, p[1:]):
                if b0 <= beat <= b1:
                    break
        return t0 + (beat - b0) * (t1 - t0) / (b1 - b0)

    def bpm_at(self, beat):
        p = self.pts
        for (b0, t0), (b1, t1) in zip(p, p[1:]):
            if beat < b1:
                return 60.0 * (b1 - b0) / (t1 - t0)
        (b0, t0), (b1, t1) = p[-2], p[-1]
        return 60.0 * (b1 - b0) / (t1 - t0)

    def describe(self):
        out = []
        p = self.pts
        for (b0, t0), (b1, t1) in zip(p, p[1:]):
            out.append(f"{self.name}: beats {b0:g}-{b1:g}  {t0:7.3f}s-{t1:7.3f}s  {60*(b1-b0)/(t1-t0):6.1f} bpm")
        return out
