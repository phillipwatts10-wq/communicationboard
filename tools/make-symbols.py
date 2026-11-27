#!/usr/bin/env python3
"""
Draws the board's symbols as SVG files in the images/ folder.

Run:  python3 tools/make-symbols.py

Each symbol is simple, flat and high contrast, with thick black
outlines, drawn on a 100 x 100 square. To change a symbol, edit
its entry in SYMBOLS below and run the script again.
"""
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "images")

# Colours used inside symbols
SKIN = "#F5C9A0"
FACE = "#FFD84D"
RED = "#E8505B"
BLUE = "#4A90D9"
LIGHTBLUE = "#A9D8F5"
GREEN = "#4CAF50"
LIGHTGREEN = "#9CD67A"
YELLOW = "#FFD23F"
ORANGE = "#F7A541"
BROWN = "#9C6B3F"
TAN = "#E8C07D"
PURPLE = "#9B6BD3"
GREY = "#8A8A8A"
WHITE = "#FFFFFF"
DARK = "#333333"

S = 'stroke="#000" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"'
T = 'stroke="#000" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" fill="none"'


def svg(body):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
            + body + "</svg>\n")


# ---------- reusable parts ----------
def person(cx, top, fill, scale=1.0):
    """Simple person: head and rounded body."""
    s = scale
    head = f'<circle cx="{cx}" cy="{top + 12*s}" r="{12*s}" fill="{SKIN}" {S}/>'
    body = (f'<path d="M{cx-20*s} {top+70*s} V{top+44*s} Q{cx-20*s} {top+28*s} {cx} {top+28*s} '
            f'Q{cx+20*s} {top+28*s} {cx+20*s} {top+44*s} V{top+70*s} Z" fill="{fill}" {S}/>')
    return body + head


def hand(cx, cy, s=1.0, fill=SKIN, rot=0):
    """Open hand, fingers up, centred near (cx, cy)."""
    parts = []
    fingers = [(-18, -26), (-8, -32), (2, -30), (12, -24)]
    for x, y in fingers:
        parts.append(f'<rect x="{x}" y="{y}" width="9" height="{-y + 6}" rx="4.5" fill="{fill}" {S}/>')
    parts.append(f'<rect x="-30" y="-6" width="9" height="24" rx="4.5" transform="rotate(-35 -26 6)" fill="{fill}" {S}/>')
    parts.append(f'<rect x="-20" y="-6" width="42" height="34" rx="11" fill="{fill}" {S}/>')
    return (f'<g transform="translate({cx} {cy}) rotate({rot}) scale({s})">' + "".join(parts) + "</g>")


def face(fill, eyes, mouth, extra=""):
    return (f'<circle cx="50" cy="52" r="40" fill="{fill}" {S}/>' + eyes + mouth + extra)


DOT_EYES = '<circle cx="36" cy="44" r="4.5"/><circle cx="64" cy="44" r="4.5"/>'


def arrow(x1, y1, x2, y2):
    import math
    ang = math.atan2(y2 - y1, x2 - x1)
    a1 = ang + math.radians(150)
    a2 = ang - math.radians(150)
    L = 12
    p1 = (x2 + L * math.cos(a1), y2 + L * math.sin(a1))
    p2 = (x2 + L * math.cos(a2), y2 + L * math.sin(a2))
    return (f'<path d="M{x1} {y1} L{x2} {y2}" {T}/>'
            f'<path d="M{p1[0]:.1f} {p1[1]:.1f} L{x2} {y2} L{p2[0]:.1f} {p2[1]:.1f}" {T}/>')


def runner(x, y, fill):
    return (f'<circle cx="{x+4}" cy="{y-30}" r="8" fill="{SKIN}" {S}/>'
            f'<path d="M{x+2} {y-21} L{x-3} {y+2}" {T}/>'
            f'<path d="M{x-16} {y-6} L{x-1} {y-15} L{x+12} {y-6}" {T}/>'
            f'<path d="M{x-16} {y+20} L{x-3} {y+2} L{x+10} {y+10} L{x+8} {y+24}" {T}/>'
            f'<path d="M{x-6} {y-20} L{x+8} {y-20} L{x+6} {y-2} L{x-6} {y-2} Z" fill="{fill}" {S}/>')


def tick(cx, cy, s=1, colour=WHITE):
    return (f'<path d="M{cx-18*s} {cy} L{cx-5*s} {cy+13*s} L{cx+20*s} {cy-14*s}" '
            f'stroke="{colour}" stroke-width="{9*s}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')


# ---------- the symbols ----------
SYMBOLS = {}

# --- core words ---
SYMBOLS["i"] = person(42, 10, ORANGE, 1.1) + arrow(94, 62, 66, 62)
SYMBOLS["want"] = (hand(32, 40, 0.85) + hand(68, 40, 0.85)
                   + arrow(50, 70, 50, 94))
SYMBOLS["need"] = (person(38, 12, YELLOW, 1.05)
                   + f'<rect x="72" y="14" width="12" height="46" rx="6" fill="{RED}" {S}/>'
                   + f'<circle cx="78" cy="76" r="7" fill="{RED}" {S}/>')
SYMBOLS["feel"] = (f'<path d="M50 86 C20 64 10 48 14 32 C18 16 40 12 50 30 '
                   f'C60 12 82 16 86 32 C90 48 80 64 50 86 Z" fill="{RED}" {S}/>')

# --- categories ---
SYMBOLS["food"] = (f'<circle cx="50" cy="52" r="30" fill="{WHITE}" {S}/>'
                   f'<circle cx="50" cy="52" r="20" fill="{WHITE}" {S}/>'
                   f'<path d="M10 22 V44 M16 22 V44 M22 22 V44 M10 44 Q16 52 22 44 M16 48 V88" {T}/>'
                   f'<path d="M84 88 V20 Q94 34 90 56 H84" fill="{GREY}" {S}/>')
SYMBOLS["drinks"] = (f'<path d="M22 30 H64 L60 88 H26 Z" fill="{WHITE}" {S}/>'
                     f'<path d="M24 50 H62 L60 88 H26 Z" fill="{LIGHTBLUE}" {S}/>'
                     f'<path d="M64 42 Q84 42 82 58 Q80 72 62 72" {T}/>'
                     f'<path d="M34 22 Q38 12 34 6 M48 22 Q52 12 48 6" {T}/>')
SYMBOLS["toys"] = (f'<rect x="10" y="50" width="36" height="36" rx="4" fill="{BLUE}" {S}/>'
                   f'<rect x="20" y="20" width="26" height="30" rx="4" fill="{YELLOW}" {S}/>'
                   f'<circle cx="70" cy="64" r="22" fill="{RED}" {S}/>'
                   f'<path d="M50 60 Q70 50 90 60 M52 74 Q70 82 88 72" stroke="{WHITE}" stroke-width="5" fill="none"/>')
SYMBOLS["games"] = (f'<rect x="10" y="30" width="42" height="42" rx="8" fill="{WHITE}" {S}/>'
                    '<circle cx="21" cy="41" r="4.5"/><circle cx="31" cy="51" r="4.5"/><circle cx="41" cy="61" r="4.5"/>'
                    f'<rect x="50" y="22" width="42" height="42" rx="8" fill="{RED}" transform="rotate(12 71 43)" {S}/>'
                    f'<g transform="rotate(12 71 43)"><circle cx="61" cy="33" r="4.5" fill="#fff"/>'
                    '<circle cx="81" cy="33" r="4.5" fill="#fff"/><circle cx="61" cy="53" r="4.5" fill="#fff"/>'
                    '<circle cx="81" cy="53" r="4.5" fill="#fff"/></g>')
SYMBOLS["activities"] = (f'<circle cx="50" cy="16" r="10" fill="{SKIN}" {S}/>'
                         f'<path d="M50 28 V60 M50 36 L24 14 M50 36 L76 14 M50 60 L28 90 M50 60 L72 90" {T}/>'
                         f'<path d="M40 30 H60 V58 H40 Z" fill="{GREEN}" {S}/>')
SYMBOLS["places"] = (f'<path d="M50 94 C30 66 18 52 18 36 A32 32 0 0 1 82 36 C82 52 70 66 50 94 Z" fill="{RED}" {S}/>'
                     f'<circle cx="50" cy="36" r="12" fill="{WHITE}" {S}/>')

# --- need ---
SYMBOLS["toilet"] = (f'<rect x="56" y="10" width="28" height="38" rx="4" fill="{WHITE}" {S}/>'
                     f'<path d="M16 48 H84 V56 Q84 76 62 80 L64 92 H36 L38 80 Q16 76 16 56 Z" fill="{WHITE}" {S}/>'
                     f'<path d="M16 56 H84" {S} fill="none"/>'
                     f'<rect x="62" y="18" width="14" height="5" rx="2" fill="{GREY}"/>')
SYMBOLS["break"] = (f'<circle cx="50" cy="50" r="40" fill="{BLUE}" {S}/>'
                    f'<rect x="33" y="28" width="12" height="44" rx="3" fill="{WHITE}" {S}/>'
                    f'<rect x="55" y="28" width="12" height="44" rx="3" fill="{WHITE}" {S}/>')
SYMBOLS["drink"] = (f'<path d="M58 30 L70 6 L80 8" {T}/>'
                    f'<path d="M24 28 H76 L70 92 H30 Z" fill="{WHITE}" {S}/>'
                    f'<path d="M27 46 H73 L70 92 H30 Z" fill="{LIGHTBLUE}" {S}/>'
                    f'<path d="M60 28 L62 46" {T}/>')
SYMBOLS["quiet"] = face(FACE,
                        '<path d="M30 42 Q37 48 44 42 M56 42 Q63 48 70 42" stroke="#000" stroke-width="4" fill="none" stroke-linecap="round"/>',
                        '<path d="M38 70 H62" stroke="#000" stroke-width="4" stroke-linecap="round"/>',
                        f'<rect x="44" y="50" width="12" height="40" rx="6" fill="{SKIN}" {S}/>')

# --- feelings ---
SYMBOLS["happy"] = face(FACE, DOT_EYES, f'<path d="M30 60 Q50 82 70 60" {T}/>')
SYMBOLS["sad"] = face(FACE, DOT_EYES, f'<path d="M32 74 Q50 56 68 74" {T}/>',
                      f'<path d="M66 52 Q60 62 66 66 Q72 62 66 52 Z" fill="{LIGHTBLUE}" stroke="#000" stroke-width="2.5"/>')
SYMBOLS["angry"] = face("#F4876B", DOT_EYES, f'<path d="M34 72 Q50 60 66 72" {T}/>',
                        f'<path d="M26 30 L44 38 M74 30 L56 38" {T}/>')
SYMBOLS["tired"] = face(FACE,
                        '<path d="M28 46 Q36 52 44 46 M56 46 Q64 52 72 46" stroke="#000" stroke-width="4" fill="none" stroke-linecap="round"/>',
                        f'<ellipse cx="50" cy="70" rx="7" ry="9" fill="{DARK}"/>',
                        f'<path d="M70 6 H86 L70 22 H86" stroke="{BLUE}" stroke-width="4.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>')
SYMBOLS["worried"] = face(FACE, DOT_EYES,
                          f'<path d="M32 72 Q40 64 48 72 Q56 80 64 72" {T}/>',
                          f'<path d="M26 34 L42 28 M74 34 L58 28" {T}/>'
                          f'<path d="M82 34 Q76 44 82 48 Q88 44 82 34 Z" fill="{LIGHTBLUE}" stroke="#000" stroke-width="2.5"/>')
SYMBOLS["calm"] = face(LIGHTGREEN,
                       '<path d="M28 46 Q36 40 44 46 M56 46 Q64 40 72 46" stroke="#000" stroke-width="4" fill="none" stroke-linecap="round"/>',
                       f'<path d="M38 64 Q50 72 62 64" {T}/>')

# --- food ---
SYMBOLS["apple"] = (f'<path d="M50 30 C36 20 14 26 16 52 C18 76 36 92 50 84 C64 92 82 76 84 52 C86 26 64 20 50 30 Z" fill="{RED}" {S}/>'
                    f'<path d="M50 30 Q49 18 55 10" {T}/>'
                    f'<path d="M56 20 Q66 8 78 12 Q70 24 56 20 Z" fill="{GREEN}" {S}/>')
SYMBOLS["banana"] = (f'<path d="M16 26 Q18 80 78 78 Q88 76 84 68 Q40 66 30 22 Z" fill="{YELLOW}" {S}/>'
                     f'<path d="M14 20 L18 30 L30 26 L26 16 Z" fill="{BROWN}" {S}/>')
SYMBOLS["biscuit"] = (f'<circle cx="50" cy="50" r="38" fill="{TAN}" {S}/>'
                      f'<circle cx="50" cy="50" r="30" fill="none" stroke="{BROWN}" stroke-width="2.5" stroke-dasharray="5 5"/>'
                      + "".join(f'<circle cx="{x}" cy="{y}" r="3.5" fill="{BROWN}"/>'
                                for x, y in [(38, 38), (62, 38), (50, 50), (38, 62), (62, 62)]))
SYMBOLS["crisps"] = (f'<path d="M24 14 L30 10 L36 14 L42 10 L48 14 L54 10 L60 14 L66 10 L72 14 L76 14 '
                     f'L72 86 L66 90 L60 86 L54 90 L48 86 L42 90 L36 86 L30 90 L28 86 Z" fill="{BLUE}" {S}/>'
                     f'<ellipse cx="50" cy="52" rx="17" ry="13" fill="{YELLOW}" {S} transform="rotate(-15 50 52)"/>'
                     f'<path d="M38 50 Q50 44 62 50" stroke="{ORANGE}" stroke-width="3" fill="none"/>')
SYMBOLS["sandwich"] = (f'<rect x="12" y="24" width="76" height="16" rx="8" fill="{TAN}" {S}/>'
                       f'<path d="M12 44 Q20 36 28 44 Q36 52 44 44 Q52 36 60 44 Q68 52 76 44 Q84 36 88 44 V50 H12 Z" fill="{GREEN}" {S}/>'
                       f'<rect x="14" y="50" width="72" height="10" fill="#F2A1A8" {S}/>'
                       f'<rect x="14" y="60" width="72" height="8" fill="{YELLOW}" {S}/>'
                       f'<rect x="12" y="68" width="76" height="16" rx="8" fill="{TAN}" {S}/>')
SYMBOLS["yoghurt"] = (f'<path d="M68 34 L82 6" stroke="{GREY}" stroke-width="7" stroke-linecap="round"/>'
                      f'<path d="M24 36 H76 L68 90 H32 Z" fill="{WHITE}" {S}/>'
                      f'<path d="M27 54 H73 L71 70 H29 Z" fill="#F2A1A8" {S}/>'
                      f'<rect x="18" y="28" width="64" height="10" rx="3" fill="#F2A1A8" {S}/>')

# --- drinks ---
SYMBOLS["water"] = (f'<path d="M26 12 H74 L68 90 H32 Z" fill="{WHITE}" {S}/>'
                    f'<path d="M28 38 H72 L68 90 H32 Z" fill="{LIGHTBLUE}" {S}/>'
                    f'<path d="M40 52 Q46 48 52 52 Q58 56 64 52" stroke="{WHITE}" stroke-width="3" fill="none"/>')
SYMBOLS["juice"] = (f'<path d="M56 22 L60 4 L70 6" {T}/>'
                    f'<path d="M26 30 L36 18 H64 L74 30 V92 H26 Z" fill="{ORANGE}" {S}/>'
                    f'<path d="M26 30 H74" {S}/>'
                    f'<circle cx="50" cy="62" r="15" fill="{YELLOW}" {S}/>'
                    f'<path d="M50 47 V77 M35 62 H65 M40 51 L60 73 M60 51 L40 73" stroke="{ORANGE}" stroke-width="2"/>')
SYMBOLS["milk"] = (f'<rect x="38" y="6" width="24" height="12" rx="3" fill="{BLUE}" {S}/>'
                   f'<path d="M38 18 H62 V30 Q76 38 76 52 V92 H24 V52 Q24 38 38 30 Z" fill="{WHITE}" {S}/>'
                   f'<rect x="24" y="56" width="52" height="20" fill="{BLUE}" {S}/>')
SYMBOLS["squash"] = (f'<rect x="40" y="4" width="20" height="12" rx="3" fill="{WHITE}" {S}/>'
                     f'<path d="M40 16 H60 V26 Q74 32 74 46 V92 H26 V46 Q26 32 40 26 Z" fill="{WHITE}" {S}/>'
                     f'<path d="M27 48 H73 V91 H27 Z" fill="#E0457B"/>'
                     f'<path d="M40 16 H60 V26 Q74 32 74 46 V92 H26 V46 Q26 32 40 26 Z" fill="none" {S}/>'
                     f'<rect x="34" y="58" width="32" height="18" rx="4" fill="{WHITE}" {S}/>')

# --- toys ---
SYMBOLS["ball"] = (f'<circle cx="50" cy="50" r="38" fill="{RED}" {S}/>'
                   f'<path d="M50 12 Q30 50 50 88 Q70 50 50 12 Z" fill="{YELLOW}" {S}/>'
                   f'<path d="M14 40 Q50 52 86 40" stroke="{WHITE}" stroke-width="6" fill="none"/>'
                   f'<circle cx="50" cy="50" r="38" fill="none" {S}/>')
SYMBOLS["bricks"] = (f'<rect x="10" y="56" width="38" height="32" rx="3" fill="{RED}" {S}/>'
                     f'<rect x="52" y="56" width="38" height="32" rx="3" fill="{BLUE}" {S}/>'
                     f'<rect x="31" y="20" width="38" height="32" rx="3" fill="{YELLOW}" {S}/>'
                     + "".join(f'<rect x="{x}" y="{y}" width="10" height="6" rx="2" fill="{c}" {S}/>'
                               for x, y, c in [(15, 50, RED), (33, 50, RED), (57, 50, BLUE), (75, 50, BLUE),
                                               (36, 14, YELLOW), (54, 14, YELLOW)]))
SYMBOLS["cars"] = (f'<path d="M8 66 V52 Q8 46 16 46 L28 30 Q30 28 34 28 H62 Q66 28 68 30 L80 46 Q92 46 92 54 V66 Z" fill="{RED}" {S}/>'
                   f'<path d="M32 34 H48 V46 H24 Z M54 34 H64 L74 46 H54 Z" fill="{LIGHTBLUE}" {S}/>'
                   f'<circle cx="28" cy="68" r="11" fill="{DARK}" {S}/><circle cx="28" cy="68" r="4" fill="#fff"/>'
                   f'<circle cx="72" cy="68" r="11" fill="{DARK}" {S}/><circle cx="72" cy="68" r="4" fill="#fff"/>')
SYMBOLS["bubbles"] = "".join(
    f'<circle cx="{x}" cy="{y}" r="{r}" fill="{LIGHTBLUE}" fill-opacity="0.6" {S}/>'
    f'<path d="M{x - r*0.5:.1f} {y - r*0.2:.1f} Q{x - r*0.45:.1f} {y - r*0.55:.1f} {x - r*0.1:.1f} {y - r*0.6:.1f}" '
    f'stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>'
    for x, y, r in [(36, 60, 26), (72, 34, 18), (76, 76, 12), (22, 22, 10)])
SYMBOLS["puzzle"] = (f'<path d="M20 30 H40 A9 9 0 1 1 58 30 H78 V46 A9 9 0 1 1 78 64 V82 H20 V64 '
                     f'A9 9 0 1 0 20 46 Z" fill="{GREEN}" {S}/>')
SYMBOLS["teddy"] = (f'<ellipse cx="50" cy="76" rx="26" ry="20" fill="{BROWN}" {S}/>'
                    f'<circle cx="26" cy="20" r="11" fill="{BROWN}" {S}/><circle cx="74" cy="20" r="11" fill="{BROWN}" {S}/>'
                    f'<circle cx="50" cy="40" r="26" fill="{BROWN}" {S}/>'
                    f'<ellipse cx="50" cy="50" rx="12" ry="9" fill="{TAN}" {S}/>'
                    '<ellipse cx="50" cy="46" rx="4.5" ry="3.5"/>'
                    '<circle cx="40" cy="34" r="3.5"/><circle cx="60" cy="34" r="3.5"/>'
                    f'<ellipse cx="50" cy="80" rx="12" ry="10" fill="{TAN}"/>')

# --- games ---
STAR = "M0 -14 L4 -5 L14 -4 L6 3 L9 13 L0 7 L-9 13 L-6 3 L-14 -4 L-4 -5 Z"
SYMBOLS["matching_game"] = (f'<rect x="8" y="18" width="38" height="56" rx="6" fill="{WHITE}" {S} transform="rotate(-8 27 46)"/>'
                            f'<path d="{STAR}" transform="translate(27 46) rotate(-8) scale(1.4)" fill="{YELLOW}" {S}/>'
                            f'<rect x="54" y="26" width="38" height="56" rx="6" fill="{WHITE}" {S} transform="rotate(8 73 54)"/>'
                            f'<path d="{STAR}" transform="translate(73 54) rotate(8) scale(1.4)" fill="{YELLOW}" {S}/>')
SYMBOLS["board_game"] = (f'<rect x="10" y="22" width="80" height="64" rx="4" fill="{WHITE}" {S}/>'
                         + "".join(f'<rect x="{10 + c*16}" y="{22 + r*16}" width="16" height="16" fill="{GREEN if (r + c) % 2 else WHITE}"/>'
                                   for r in range(4) for c in range(5))
                         + f'<rect x="10" y="22" width="80" height="64" rx="4" fill="none" {S}/>'
                         + f'<circle cx="58" cy="20" r="8" fill="{RED}" {S}/>'
                           f'<path d="M50 44 Q58 26 66 44 Z" fill="{RED}" {S}/>')
SYMBOLS["ipad_game"] = (f'<rect x="8" y="16" width="84" height="64" rx="8" fill="{DARK}" {S}/>'
                        f'<rect x="16" y="23" width="68" height="50" rx="2" fill="{LIGHTBLUE}"/>'
                        f'<rect x="28" y="38" width="44" height="22" rx="11" fill="{WHITE}" {S}/>'
                        '<path d="M37 49 H47 M42 44 V54" stroke="#000" stroke-width="3.5" stroke-linecap="round"/>'
                        f'<circle cx="58" cy="46" r="3.5" fill="{RED}"/><circle cx="64" cy="53" r="3.5" fill="{GREEN}"/>')
SYMBOLS["chase"] = (runner(32, 52, BLUE) + runner(74, 52, ORANGE)
                    + '<path d="M4 40 H14 M2 50 H12 M4 60 H14" stroke="#000" stroke-width="3" stroke-linecap="round"/>')

# --- activities ---
SYMBOLS["music"] = (f'<path d="M34 72 V22 L78 12 V62" {T}/>'
                    f'<path d="M34 22 L78 12 V24 L34 34 Z" fill="#000"/>'
                    f'<ellipse cx="24" cy="74" rx="12" ry="9" fill="{PURPLE}" {S} transform="rotate(-20 24 74)"/>'
                    f'<ellipse cx="68" cy="64" rx="12" ry="9" fill="{PURPLE}" {S} transform="rotate(-20 68 64)"/>')
SYMBOLS["painting"] = (f'<path d="M50 14 C80 14 94 34 88 54 C84 66 70 60 64 68 C58 78 70 88 52 88 C24 88 8 70 8 50 C8 28 26 14 50 14 Z" fill="{TAN}" {S}/>'
                       f'<circle cx="64" cy="50" r="7" fill="{WHITE}" {S}/>'
                       f'<circle cx="30" cy="40" r="7" fill="{RED}" {S}/><circle cx="50" cy="30" r="7" fill="{BLUE}" {S}/>'
                       f'<circle cx="72" cy="32" r="7" fill="{YELLOW}" {S}/><circle cx="28" cy="64" r="7" fill="{GREEN}" {S}/>'
                       f'<path d="M44 78 L80 96" stroke="{BROWN}" stroke-width="7" stroke-linecap="round"/>')
SYMBOLS["reading"] = (f'<path d="M50 26 Q30 14 8 20 V80 Q30 74 50 86 Z" fill="{WHITE}" {S}/>'
                      f'<path d="M50 26 Q70 14 92 20 V80 Q70 74 50 86 Z" fill="{WHITE}" {S}/>'
                      '<path d="M18 34 Q30 30 42 36 M18 46 Q30 42 42 48 M18 58 Q30 54 42 60 '
                      'M58 36 Q70 30 82 34 M58 48 Q70 42 82 46 M58 60 Q70 54 82 58" stroke="#777" stroke-width="3" fill="none" stroke-linecap="round"/>')
SYMBOLS["swinging"] = (f'<path d="M10 92 L24 12 M38 92 L24 12 M90 92 L76 12 M62 92 L76 12" stroke="{RED}" stroke-width="6" stroke-linecap="round"/>'
                       f'<path d="M20 12 H80" stroke="{RED}" stroke-width="7" stroke-linecap="round"/>'
                       f'<path d="M40 12 L40 66 M60 12 L60 66" stroke="#000" stroke-width="3"/>'
                       f'<rect x="34" y="64" width="32" height="8" rx="3" fill="{BLUE}" {S}/>')

# --- places ---
SYMBOLS["playground"] = (f'<path d="M14 92 V22 M34 92 V22" stroke="{BLUE}" stroke-width="6" stroke-linecap="round"/>'
                         f'<path d="M14 38 H34 M14 54 H34 M14 70 H34" stroke="{BLUE}" stroke-width="4"/>'
                         f'<rect x="10" y="18" width="30" height="8" rx="2" fill="{BLUE}" {S}/>'
                         f'<path d="M38 22 Q56 24 66 60 Q72 82 94 84 V92 Q66 92 58 64 Q50 34 38 32 Z" fill="{YELLOW}" {S}/>')
SYMBOLS["garden"] = (f'<rect x="4" y="78" width="92" height="16" rx="3" fill="{LIGHTGREEN}" {S}/>'
                     f'<path d="M30 78 V46 M70 78 V40" stroke="{GREEN}" stroke-width="5"/>'
                     f'<path d="M30 64 Q20 56 16 62 Q22 70 30 66 Z M70 60 Q80 52 84 58 Q78 66 70 62 Z" fill="{GREEN}" {S}/>'
                     + "".join(f'<circle cx="{cx + dx}" cy="{cy + dy}" r="8" fill="{col}" {S}/>'
                               for cx, cy, col in [(30, 36, RED), (70, 30, PURPLE)]
                               for dx, dy in [(0, -10), (10, 0), (0, 10), (-10, 0)])
                     + f'<circle cx="30" cy="36" r="6" fill="{YELLOW}" {S}/><circle cx="70" cy="30" r="6" fill="{YELLOW}" {S}/>')
SYMBOLS["library"] = (f'<rect x="8" y="10" width="84" height="82" rx="3" fill="{BROWN}" {S}/>'
                      f'<rect x="14" y="16" width="72" height="32" fill="#F3E3C9"/><rect x="14" y="54" width="72" height="32" fill="#F3E3C9"/>'
                      + "".join(f'<rect x="{x}" y="{y}" width="9" height="{h}" fill="{c}" stroke="#000" stroke-width="2"/>'
                                for x, y, h, c in [(16, 22, 26, RED), (26, 18, 30, BLUE), (36, 24, 24, GREEN),
                                                   (46, 20, 28, YELLOW), (56, 22, 26, PURPLE), (66, 18, 30, ORANGE),
                                                   (16, 58, 28, GREEN), (26, 62, 24, YELLOW), (36, 56, 30, RED),
                                                   (46, 60, 26, BLUE), (56, 58, 28, ORANGE), (66, 62, 24, PURPLE)]))
SYMBOLS["hall"] = (f'<path d="M6 38 L50 10 L94 38 Z" fill="{RED}" {S}/>'
                   f'<rect x="12" y="38" width="76" height="52" fill="{TAN}" {S}/>'
                   f'<rect x="36" y="56" width="28" height="34" fill="{BROWN}" {S}/>'
                   f'<path d="M50 56 V90" {S}/>'
                   f'<rect x="18" y="48" width="12" height="14" fill="{LIGHTBLUE}" {S}/>'
                   f'<rect x="70" y="48" width="12" height="14" fill="{LIGHTBLUE}" {S}/>')
SYMBOLS["home"] = (f'<path d="M8 50 L50 14 L92 50 Z" fill="{RED}" {S}/>'
                   f'<rect x="18" y="50" width="64" height="40" fill="{YELLOW}" {S}/>'
                   f'<rect x="44" y="64" width="16" height="26" fill="{BROWN}" {S}/>'
                   f'<rect x="24" y="58" width="14" height="14" fill="{LIGHTBLUE}" {S}/>'
                   f'<rect x="66" y="58" width="12" height="14" fill="{LIGHTBLUE}" {S}/>')

# --- fixed bar ---
SYMBOLS["help"] = (hand(50, 58, 1.25)
                   + '<path d="M12 30 Q6 40 12 50 M88 30 Q94 40 88 50" stroke="#000" stroke-width="4" fill="none" stroke-linecap="round"/>')
SYMBOLS["stop"] = ('<path d="M33 6 H67 L94 33 V67 L67 94 H33 L6 67 V33 Z" fill="#D62828" stroke="#000" stroke-width="3.5" stroke-linejoin="round"/>'
                   '<path d="M36 13 H64 L87 36 V64 L64 87 H36 L13 64 V36 Z" fill="none" stroke="#fff" stroke-width="3"/>'
                   '<rect x="26" y="44" width="48" height="12" rx="4" fill="#fff"/>')
SYMBOLS["more"] = (f'<circle cx="50" cy="50" r="40" fill="{GREEN}" {S}/>'
                   '<path d="M50 26 V74 M26 50 H74" stroke="#fff" stroke-width="12" stroke-linecap="round"/>')
SYMBOLS["finished"] = ('<path d="M20 92 V8" stroke="#000" stroke-width="6" stroke-linecap="round"/>'
                       '<rect x="22" y="10" width="66" height="44" fill="#fff" stroke="#000" stroke-width="3.5"/>'
                       + "".join(f'<rect x="{22 + c*11}" y="{10 + r*11}" width="11" height="11" fill="#000"/>'
                                 for r in range(4) for c in range(6) if (r + c) % 2 == 0)
                       + '<rect x="22" y="10" width="66" height="44" fill="none" stroke="#000" stroke-width="3.5"/>')
SYMBOLS["yes"] = (f'<circle cx="50" cy="50" r="40" fill="#2E9E44" {S}/>' + tick(50, 52, 1.2))
SYMBOLS["no"] = ('<circle cx="50" cy="50" r="40" fill="#D62828" stroke="#000" stroke-width="3.5"/>'
                 '<path d="M32 32 L68 68 M68 32 L32 68" stroke="#fff" stroke-width="11" stroke-linecap="round"/>')


# File names (as used in data/board.js)
FILE_NAMES = {
    "matching_game": "matching-game",
    "board_game": "board-game",
    "ipad_game": "ipad-game",
}

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for key, body in SYMBOLS.items():
        name = FILE_NAMES.get(key, key) + ".svg"
        with open(os.path.join(OUT, name), "w") as f:
            f.write(svg(body))
    print("Wrote", len(SYMBOLS), "symbols to", os.path.abspath(OUT))
