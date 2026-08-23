#!/usr/bin/env python3
# Bouwt de Mindlockresidence visitekaart (voor + achter), liggend 88x58 mm.
# Genereert: card-print.html (94x64 mm met 3 mm afloop, voor de drukklare PDF)
#            card-preview.html (op trimformaat, met radius + schaduw, voor een nette PNG)
import os

BASE = "file:///Users/macbookpro13/NEW%20LIFE/mindlock-residence/"

# ---- iconen (mono line, stroke=currentColor) ----
IC_PHONE = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" '
            'stroke-linecap="round" stroke-linejoin="round"><path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25'
            'a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417'
            'l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21'
            'l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25z"/></svg>')
IC_MAIL = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" '
           'stroke-linecap="round" stroke-linejoin="round"><path d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15'
           'a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243'
           'a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"/></svg>')
IC_GLOBE = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" '
            'stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.25"/>'
            '<path d="M3 12h18M12 2.75c2.5 2.4 3.9 5.8 3.9 9.25S14.5 18.85 12 21.25C9.5 18.85 8.1 15.45 8.1 12S9.5 5.15 12 2.75z"/></svg>')
IC_IG = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" '
         'stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/>'
         '<circle cx="12" cy="12" r="3.6"/><circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none"/></svg>')

FONT_CSS = f"""
@font-face {{ font-family:'Bebas Neue'; src:url('{BASE}assets/fonts/BebasNeue-Regular.ttf'); font-weight:400; }}
@font-face {{ font-family:'Space Grotesk'; src:url('{BASE}assets/fonts/SpaceGrotesk.ttf'); font-weight:300 700; }}
@font-face {{ font-family:'Inter'; src:url('{BASE}assets/fonts/Inter.ttf'); font-weight:300 700; }}
"""

# ---- ontwerp-CSS (in mm, want de kaart denkt in mm) ----
CARD_CSS = f"""
:root{{ --bg:#070707; --ink:#f1f1f1; --muted:#9a9a9a; --red:#e10600; --redhot:#ff2a17; }}
*{{ margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }}
.card{{ position:relative; overflow:hidden; background:#050505; color:var(--ink);
  font-family:'Inter',sans-serif; }}

/* ---------- VOORKANT ---------- */
.front .bg{{ position:absolute; inset:0; background:url('{BASE}assets/banner.png') center 38%/cover no-repeat; }}
.front .bg::after{{ content:''; position:absolute; inset:0; background:
   radial-gradient(115% 75% at 50% 58%, rgba(225,6,0,.13), transparent 62%),
   linear-gradient(180deg, rgba(5,5,5,.92) 0%, rgba(5,5,5,.30) 42%, rgba(5,5,5,.95) 100%); }}
.front .center{{ position:absolute; inset:0; z-index:2; display:flex; flex-direction:column;
   align-items:center; justify-content:center; gap:3.2mm; }}
.front .logo{{ height:24mm; filter:drop-shadow(0 0 4mm rgba(225,6,0,.55)); }}
.front .wm{{ font-family:'Space Grotesk',sans-serif; font-weight:700; text-transform:uppercase;
   color:#fff; font-size:4.0mm; letter-spacing:.30em; padding-left:.30em; line-height:1; }}
.front .rule{{ width:13mm; height:.45mm; background:var(--red); box-shadow:0 0 2mm rgba(225,6,0,.7); }}
.front .tag{{ font-family:'Inter',sans-serif; font-weight:400; text-transform:uppercase;
   color:#c9c9c9; font-size:1.95mm; letter-spacing:.34em; padding-left:.34em; }}

/* ---------- ACHTERKANT ---------- */
.back{{ background:#070707; }}
.back .bgfade{{ position:absolute; left:0; right:0; bottom:0; height:62%;
   background:url('{BASE}assets/banner.png') center bottom/cover no-repeat; opacity:.22;
   -webkit-mask-image:linear-gradient(180deg, transparent, #000 78%); mask-image:linear-gradient(180deg, transparent, #000 78%); }}
.back .glow{{ position:absolute; top:-14mm; right:-14mm; width:40mm; height:40mm; border-radius:50%;
   background:radial-gradient(circle, rgba(225,6,0,.30), transparent 65%); }}
.back .wmk{{ position:absolute; right:-11mm; top:50%; transform:translateY(-50%); height:60mm;
   opacity:.11; filter:saturate(1.15); }}
.back .content{{ position:absolute; inset:0; z-index:3; padding:7mm 8mm; display:flex; flex-direction:column; justify-content:space-between; }}
.back .brand{{ display:flex; align-items:center; gap:3mm; }}
.back .brand img{{ height:9mm; filter:drop-shadow(0 0 2mm rgba(225,6,0,.5)); }}
.back .brand .wm{{ font-family:'Space Grotesk',sans-serif; font-weight:700; text-transform:uppercase;
   color:#fff; font-size:3.0mm; letter-spacing:.22em; line-height:1.1; }}
.back .role{{ margin-top:.4mm; }}
.back .role .fn{{ font-family:'Bebas Neue',sans-serif; color:var(--red); font-size:6.4mm; letter-spacing:.06em; line-height:.95; }}
.back .role .disc{{ font-family:'Inter',sans-serif; color:var(--muted); font-size:1.95mm; letter-spacing:.16em; text-transform:uppercase; margin-top:.6mm; }}
.back .contact{{ display:flex; flex-direction:column; gap:2.3mm; }}
.back .row{{ display:flex; align-items:center; gap:2.6mm; }}
.back .row svg{{ width:3.3mm; height:3.3mm; color:var(--red); flex:0 0 auto; }}
.back .row span{{ font-family:'Inter',sans-serif; font-weight:500; color:#ececec; font-size:2.65mm; letter-spacing:.02em; }}
.back .edge{{ position:absolute; left:0; top:0; bottom:0; width:1.1mm; background:linear-gradient(180deg,var(--red),var(--redhot)); z-index:4; }}
"""

FRONT_INNER = """
  <div class="bg"></div>
  <div class="center">
    <img class="logo" src="{BASE}assets/logo.png" alt="">
    <div class="wm">Mindlockresidence</div>
    <div class="rule"></div>
    <div class="tag">The residence for creative energy</div>
  </div>
""".replace("{BASE}", BASE)

BACK_INNER = """
  <div class="bgfade"></div>
  <div class="glow"></div>
  <img class="wmk" src="{BASE}assets/logo.png" alt="">
  <div class="edge"></div>
  <div class="content">
    <div class="head">
      <div class="brand">
        <img src="{BASE}assets/logo.png" alt="">
        <div class="wm">Mindlock<br>residence</div>
      </div>
      <div class="role">
        <div class="fn">Creative Studio</div>
        <div class="disc">Music &middot; Film &middot; Photography &middot; Design</div>
      </div>
    </div>
    <div class="contact">
      <div class="row">__IC_PHONE__<span>+31 6 40 21 80 54</span></div>
      <div class="row">__IC_MAIL__<span>Mindlockresidence@gmail.com</span></div>
      <div class="row">__IC_GLOBE__<span>mindlockresidence.com</span></div>
      <div class="row">__IC_IG__<span>@mindlockresidence</span></div>
    </div>
  </div>
""".replace("{BASE}", BASE).replace("__IC_PHONE__", IC_PHONE).replace("__IC_MAIL__", IC_MAIL).replace("__IC_GLOBE__", IC_GLOBE).replace("__IC_IG__", IC_IG)

def page(mode):
    if mode == "print":
        # 91x61 mm met 3 mm afloop (trim 85x55); elke kaart een eigen pagina
        wrap_css = """
        @page { size:91mm 61mm; margin:0; }
        html,body{ background:#fff; }
        .card{ width:91mm; height:61mm; page-break-after:always; }
        .card:last-child{ page-break-after:auto; }
        .back .content{ padding:9mm 10mm; } /* 3mm afloop + ~6mm veilige marge vanaf snijrand */
        .front .center{ padding:3mm; }
        """
    else:
        # preview op trimformaat 85x55 met radius + schaduw op donkere ondergrond
        wrap_css = """
        html,body{ background:#1b1b1e; }
        body{ display:flex; gap:9mm; align-items:center; justify-content:center; padding:9mm; }
        .card{ width:85mm; height:55mm; border-radius:2.4mm; box-shadow:0 6mm 16mm rgba(0,0,0,.6); }
        """
    cards = f'<div class="card front">{FRONT_INNER}</div>\n<div class="card back">{BACK_INNER}</div>'
    return f"""<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8">
<style>{FONT_CSS}{CARD_CSS}{wrap_css}</style></head>
<body>{cards}</body></html>"""

def single(side):
    inner = FRONT_INNER if side == "front" else BACK_INNER
    cls = "front" if side == "front" else "back"
    wrap_css = """
    @page { size:91mm 61mm; margin:0; }
    html,body{ background:#fff; }
    .card{ width:91mm; height:61mm; }
    .back .content{ padding:9mm 10mm; }
    .front .center{ padding:3mm; }
    """
    return f"""<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8">
<style>{FONT_CSS}{CARD_CSS}{wrap_css}</style></head>
<body><div class="card {cls}">{inner}</div></body></html>"""

here = os.path.dirname(os.path.abspath(__file__))
open(os.path.join(here, "card-print.html"), "w").write(page("print"))
open(os.path.join(here, "card-preview.html"), "w").write(page("preview"))
open(os.path.join(here, "card-front-print.html"), "w").write(single("front"))
open(os.path.join(here, "card-back-print.html"), "w").write(single("back"))
print("alle html geschreven")
