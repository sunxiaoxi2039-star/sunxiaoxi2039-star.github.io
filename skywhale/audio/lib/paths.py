"""Filesystem layout.  Code lives in the repo; everything heavy lives in
the build directory (default /workspace/_build/audio, override with the
SKYWHALE_AUDIO_BUILD environment variable)."""
import os

AUDIO_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO_SKYWHALE = os.path.dirname(AUDIO_DIR)
TIMELINE = os.path.join(REPO_SKYWHALE, "timeline.json")

BUILD = os.environ.get("SKYWHALE_AUDIO_BUILD", "/workspace/_build/audio")
SRC = os.path.join(BUILD, "src")
SFIZZ_DIR = os.path.join(SRC, "sfizz")
SFIZZ_RENDER = os.path.join(SFIZZ_DIR, "build", "library", "bin", "sfizz_render")
VSCO_DIR = os.path.join(SRC, "vsco2ce")
SALAMANDER_DIR = os.path.join(SRC, "salamander")
DOWNLOADS = os.path.join(BUILD, "downloads")
CACHE_DIR = os.path.join(BUILD, "cache")
SFZ_DIR = os.path.join(BUILD, "sfz")
WORK = os.path.join(BUILD, "work")
MIDI_DIR = os.path.join(WORK, "midi")
PARTS_DIR = os.path.join(WORK, "parts")
EVENTS_DIR = os.path.join(WORK, "events")
STEMS_DIR = os.path.join(BUILD, "stems")
MIX = os.path.join(BUILD, "skywhale_mix.wav")
SPECTROGRAM = os.path.join(BUILD, "mix_spectrogram.png")
REPORT = os.path.join(BUILD, "verify_report.json")
