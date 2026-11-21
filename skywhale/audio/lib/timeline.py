"""Read skywhale/timeline.json: the single source of truth for sync.

Everything in the audio pipeline that depends on picture (cue times, cue
distances, in-cloud flags, shot boundaries, shot distances, total length)
is looked up here, so moving a cue in timeline.json and re-running
build_audio.py moves the corresponding sound and re-anchors the score.
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_TIMELINE = os.path.normpath(os.path.join(HERE, "..", "..", "timeline.json"))


class Timeline:
    def __init__(self, path=DEFAULT_TIMELINE):
        with open(path) as f:
            self.raw = json.load(f)
        self.path = path
        self.fps = self.raw["fps"]
        self.total_frames = self.raw["totalFrames"]
        self.duration = self.total_frames / self.fps
        self.cues = {c["id"]: c for c in self.raw["cues"]}
        self.shots = []
        for s in self.raw["shots"]:
            s = dict(s)
            s["start"] = s["startFrame"] / self.fps
            s["end"] = s["endFrame"] / self.fps
            nums = [float(n) for n in re.findall(r"(\d+(?:\.\d+)?)\s*m\b", s.get("whaleDistance", ""))]
            # "350 m ... -> 180 m": first and last numbers are start/end distance
            s["dist_start"] = nums[0] if nums else None
            s["dist_end"] = nums[-1] if nums else None
            self.shots.append(s)
        self.movements = []
        for m in self.raw["movements"]:
            m = dict(m)
            m["start"] = m["startFrame"] / self.fps
            m["end"] = m["endFrame"] / self.fps
            self.movements.append(m)

    # ---- cues ---------------------------------------------------------
    def t(self, cue_id):
        return float(self.cues[cue_id]["t"])

    def cue(self, cue_id):
        return self.cues[cue_id]

    # ---- shots --------------------------------------------------------
    def shot_at(self, t):
        for s in self.shots:
            if s["start"] <= t < s["end"]:
                return s
        return self.shots[-1]

    def shot(self, shot_id):
        for s in self.shots:
            if s["id"] == shot_id:
                return s
        raise KeyError(shot_id)

    def cut_times(self):
        return [s["start"] for s in self.shots[1:]]

    def movement(self, mid):
        for m in self.movements:
            if m["id"] == mid:
                return m
        raise KeyError(mid)

    def shot_distance(self, t):
        """Whale distance (m) for a moment, interpolated inside a shot that
        moves (e.g. 1A '350 m ... -> 180 m')."""
        s = self.shot_at(t)
        a, b = s["dist_start"], s["dist_end"]
        if a is None:
            return 150.0
        if a == b or "->" not in s.get("whaleDistance", ""):
            return a  # e.g. 5C 'Old Whale 150 m; pod 300-1500 m' -> the Old Whale
        u = (t - s["start"]) / max(1e-9, s["end"] - s["start"])
        return a + (b - a) * min(1.0, max(0.0, u))

    def in_cloud_windows(self):
        return [tuple(s["inCloud"]) for s in self.shots if "inCloud" in s]

    def frame_of(self, t):
        return t * self.fps
