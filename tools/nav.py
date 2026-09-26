import re, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
BOOK = "https://api.leadconnectorhq.com/widget/booking/Av6i7gL0YzbszYFfnKqQ"
NAV = [
    ("index.html", "Overview"),
    ("investor-ready.html", "Funding Scorecard"),
    ("diagnostic.html", "Exit Ready"),
    ("index.html#services", "Services"),
    ("investors.html", "Network"),
]
ACTIVE = {
    "index.html": "index.html",
    "investor-ready.html": "investor-ready.html",
    "diagnostic.html": "diagnostic.html",
    "transaction-readiness.html": "diagnostic.html",
    "ethical-acquisitions.html": "index.html#services",
    "funding.html": None,
    "roadmap.html": "index.html#services",
    "finance-advisory.html": "index.html#services",
    "readiness-project.html": "index.html#services",
    "deal-ready.html": "index.html#services",
    "pitch.html": "index.html#services",
    "commercial-acceleration.html": "index.html#services",
    "investors.html": "investors.html",
    "founders.html": "investors.html",
    "privacy.html": None,
    "founder-dependence.html": "index.html#services",
    "personal-exit-readiness.html": "diagnostic.html",
}
LEGAL = '<br><small class="legal" style="display:block;margin-top:0.6rem;font-size:0.72rem;max-width:70ch;margin-left:auto;margin-right:auto;">Add Then Multiply Limited is registered in England and Wales, company number 04623437. It is not authorised or regulated by the Financial Conduct Authority. This site describes advisory services and is not a financial promotion.</small>'
FOOT_LINKS = ' · <a href="roadmap.html">Roadmap</a> · <a href="readiness-project.html">Readiness Projects</a> · <a href="funding.html">Funding</a> · <a href="founders.html">Founders</a> · <a href="privacy.html">Privacy</a>' + LEGAL
FOOT_LINKS_ENT = FOOT_LINKS.replace(" · ", " &middot; ")
nav_re = re.compile(r"(<nav>)(.*?)(</nav>)", re.S)
for page, active in ACTIVE.items():
    p = ROOT / page
    if not p.exists(): print("skip (missing)", page); continue
    s = p.read_text(encoding="utf-8")
    m = nav_re.search(s)
    if not m: print("no nav", page); continue
    inner = m.group(2)
    am = re.search(r"\n([ \t]*)<a ", inner); indent = am.group(1) if am else "  "
    cm = re.search(r"\n([ \t]*)$", inner); close_indent = cm.group(1) if cm else ""
    links = []
    for href, label in NAV:
        cls = ' class="active"' if href == active else ""
        links.append(indent + '<a href="' + href + '"' + cls + '>' + label + '</a>')
    links.append(f'{indent}<a href="{BOOK}" class="nav-cta" target="_blank" rel="noopener">Book a call</a>')
    s = s[:m.start(2)] + "\n" + "\n".join(links) + "\n" + close_indent + s[m.end(2):]
    base = "Fractional finance leadership for ambitious founder-led businesses"
    foot = s.split("<footer>")[1].split("</footer>")[0]
    links_txt = FOOT_LINKS_ENT if "&middot;" in foot else FOOT_LINKS
    s, n = re.subn(r"(<footer>.*?" + re.escape(base) + r")(.*?)(</footer>)", lambda mm: mm.group(1) + links_txt + mm.group(3), s, count=1, flags=re.S)
    if n != 1: print("footer not updated", page)
    p.write_text(s, encoding="utf-8"); print("nav", page, "active:", active)
