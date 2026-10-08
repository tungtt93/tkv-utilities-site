"""Capture maximized TKV Utilities screenshots (no image redaction).

Expects the app to already show demo-safe values (temporary code fakes).
Requires: pywin32, Pillow.
"""
from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

import ctypes
import win32con
import win32gui
import win32process
import win32ui
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "screenshots"
SCRIPTS = Path(__file__).resolve().parent

PAGES = [
    ("overview", "Tổng quan"),
    ("storage", "Dung lượng"),
    ("cleanup", "Dọn dẹp"),
    ("network", "Mạng & Port"),
]


def find_tkv_hwnd() -> int:
    matches: list[tuple[int, int]] = []

    def enum(hwnd, _):
        try:
            if win32gui.GetWindowText(hwnd) != "TKV Utilities":
                return
        except Exception:
            return
        l, t, r, b = win32gui.GetWindowRect(hwnd)
        area = max(0, r - l) * max(0, b - t)
        if area < 50_000:
            return
        matches.append((area, hwnd))

    win32gui.EnumWindows(enum, None)
    if not matches:
        raise RuntimeError("TKV Utilities window not found (is the app running / shown?)")
    matches.sort(reverse=True)
    return matches[0][1]


def focus_window(hwnd: int) -> None:
    user32 = ctypes.windll.user32
    win32gui.ShowWindow(hwnd, win32con.SW_SHOW)
    user32.AllowSetForegroundWindow(-1)
    fg = win32gui.GetForegroundWindow()
    cur_tid = win32process.GetWindowThreadProcessId(hwnd)[0]
    fg_tid = win32process.GetWindowThreadProcessId(fg)[0] if fg else 0
    if fg_tid and fg_tid != cur_tid:
        user32.AttachThreadInput(fg_tid, cur_tid, True)
    try:
        win32gui.BringWindowToTop(hwnd)
        win32gui.SetForegroundWindow(hwnd)
    except Exception:
        pass
    finally:
        if fg_tid and fg_tid != cur_tid:
            user32.AttachThreadInput(fg_tid, cur_tid, False)
    time.sleep(0.25)


def maximize_window(hwnd: int) -> None:
    focus_window(hwnd)
    win32gui.ShowWindow(hwnd, win32con.SW_MAXIMIZE)
    time.sleep(0.45)
    l, t, r, b = win32gui.GetWindowRect(hwnd)
    print(f"  maximized size={(r - l)}x{(b - t)}")


def capture(hwnd: int, dest: Path) -> Image.Image:
    left, top, right, bottom = win32gui.GetWindowRect(hwnd)
    w, h = right - left, bottom - top
    if w < 200 or h < 200:
        raise RuntimeError(f"window too small: {w}x{h}")
    hwnd_dc = win32gui.GetWindowDC(hwnd)
    mfc = win32ui.CreateDCFromHandle(hwnd_dc)
    save = mfc.CreateCompatibleDC()
    bmp = win32ui.CreateBitmap()
    bmp.CreateCompatibleBitmap(mfc, w, h)
    save.SelectObject(bmp)
    ok = ctypes.windll.user32.PrintWindow(hwnd, save.GetSafeHdc(), 2)
    if not ok:
        raise RuntimeError("PrintWindow failed")
    bits = bmp.GetBitmapBits(True)
    info = bmp.GetInfo()
    img = Image.frombuffer("RGB", (info["bmWidth"], info["bmHeight"]), bits, "raw", "BGRX", 0, 1)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, optimize=True)
    win32gui.DeleteObject(bmp.GetHandle())
    save.DeleteDC()
    mfc.DeleteDC()
    win32gui.ReleaseDC(hwnd, hwnd_dc)
    return img


def click_nav(hwnd: int, name: str) -> None:
    focus_window(hwnd)
    name_file = SCRIPTS / "_nav_name.txt"
    name_file.write_text(name, encoding="utf-8")
    r = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(SCRIPTS / "uia_click.ps1"),
            "-Hwnd",
            str(hwnd),
            "-NameFile",
            str(name_file),
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    out = (r.stdout or "").strip()
    print(f"  nav[{name}]: {out or r.stderr.strip()} (code={r.returncode})")
    if r.returncode != 0:
        raise RuntimeError(f"Failed to click nav '{name}': {out} {r.stderr}")
    time.sleep(1.0)


def main() -> int:
    hwnd = find_tkv_hwnd()
    print("hwnd", hwnd)
    maximize_window(hwnd)

    for key, label in PAGES:
        print(f"\n== {key} ({label}) ==")
        click_nav(hwnd, label)
        maximize_window(hwnd)
        time.sleep(0.4)
        dest = OUT / f"{key}.png"
        img = capture(hwnd, dest)
        print("  wrote", dest, img.size)

    print("\nDone.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as e:
        print("ERROR:", e, file=sys.stderr)
        raise
