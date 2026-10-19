"""Builds the project pages for jackslaski.com from one template.
Usage (from the repo folder): python tools/build_projects.py . [slug ...]   (no slugs = all pages)
Content for every page lives in tools/projects_data.py."""
import sys, html, pathlib
from PIL import Image

ROOT = pathlib.Path(sys.argv[1])
ONLY = set(sys.argv[2:])
E = html.escape
ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>'


def web(src, width=1600, suffix=""):
    """Web-sized JPEG copy of a source image, returned as a site path."""
    if src.startswith("http") or src.startswith("images/site/"):
        return src
    p = ROOT / src
    name = p.stem.lower().replace(" ", "-") + suffix + ".jpg"
    out = ROOT / "images/site/g" / name
    if not out.exists():
        out.parent.mkdir(parents=True, exist_ok=True)
        im = Image.open(p).convert("RGB")
        if im.width > width:
            im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        im.save(out, "JPEG", quality=80, optimize=True, progressive=True)
    return f"images/site/g/{name}"


NO_MAXRES = {"rBB2LSwrFiA"}  # videos YouTube has no high-res thumbnail for
def yt_full(i): return f"https://i.ytimg.com/vi/{i}/{'hqdefault' if i in NO_MAXRES else 'maxresdefault'}.jpg"
def yt_thumb(i): return f"https://i.ytimg.com/vi/{i}/hqdefault.jpg"


def head(title, desc, image, slug):
    return f"""<!DOCTYPE html>
<html lang="en-GB">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>{E(title)} | Jack Slaski</title>
	<meta name="description" content="{E(desc)}" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="{E(title)} | Jack Slaski" />
	<meta property="og:description" content="{E(desc)}" />
	<meta property="og:image" content="{E(image if image.startswith('http') else 'https://jackslaski.com/' + image)}" />
	<meta property="og:url" content="https://jackslaski.com/{slug}.html" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="theme-color" content="#0a0c11" />
	<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath d='M6 0h26v26l-6 6H0V6z' fill='%23ff5a36'/%3E%3Ctext x='16' y='22' font-family='Arial Narrow,Arial' font-size='15' font-weight='bold' text-anchor='middle' fill='%23fff'%3EJS%3C/text%3E%3C/svg%3E" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
	<link rel="stylesheet" href="assets/style.css?v=2026101911" />
	<script>document.documentElement.classList.add('js')</script>
</head>
<body data-project="SLUG">
	<a class="skip" href="#main">Skip to content</a>

	<header class="nav" id="nav">
		<div class="wrap nav__inner">
			<a class="brand" href="index.html" aria-label="Jack Slaski, home"><span class="brand__mark">JS</span><span>Jack Slaski</span></a>
			<button class="nav__toggle" type="button" aria-expanded="false" aria-controls="nav-links" aria-label="Menu"><span></span></button>
			<nav class="nav__links" id="nav-links" aria-label="Main">
				<a href="index.html#work">Work</a>
				<a href="index.html#projects">Projects</a>
				<a href="index.html#about">About</a>
				<a href="#contact">Contact</a>
				<a class="btn" href="documents/cvjackslaski.pdf">Download CV</a>
			</nav>
		</div>
	</header>
"""


FOOT = """
		<section class="section" id="contact" aria-labelledby="contact-title">
			<div class="wrap">
				<div class="contact contact--compact reveal">
					<p class="label">Contact</p>
					<h2 class="title contact__title" id="contact-title">Like what you <span>see?</span></h2>
					<p class="contact__text">I’m looking for gameplay and systems design roles. Email is the quickest way to reach me.</p>
					<div class="contact__actions">
						<a class="btn" href="mailto:jackslaski04@gmail.com">Email me ARROW</a>
						<a class="btn btn--ghost" href="documents/cvjackslaski.pdf">Download CV</a>
					</div>
				</div>
			</div>
		</section>
	</main>

	<footer class="footer">
		<div class="wrap footer__inner">
			<span>© 2026 Jack Slaski</span>
			<a href="index.html#projects">All projects</a>
			<button class="footer__secrets" type="button" data-secrets hidden>Secrets</button>
			<a href="#top">Back to top ↑</a>
		</div>
	</footer>

	<script src="assets/main.js?v=2026101911" defer></script>
	<script src="assets/secrets.js?v=2026101911" defer></script>
</body>
</html>
""".replace("ARROW", ARROW)


def section(n, label, title, body, sid=""):
    idattr = f' id="{sid}"' if sid else ""
    return f"""
		<section class="section"{idattr}>
			<div class="wrap">
				<div class="section__head">
					<div>
						<p class="label reveal">{n:02d} // {E(label)}</p>
						<h2 class="title section__title reveal" style="--d:1">{E(title)}</h2>
					</div>
				</div>
{body}
			</div>
		</section>
"""


def paras(ps, cls="prose"):
    return f'<div class="{cls} reveal">' + "".join(f"<p>{E(p)}</p>" for p in ps) + "</div>"


def render(slug, p, nxt):
    hero = web(p["hero"], 1920) if p.get("hero") else ""
    img_tag = f'<img class="phero__bg" src="{E(hero)}" alt="" fetchpriority="high" />' if hero else ""
    chips = "".join(f'<span class="chip chip--{k}">{E(t)}</span>' for k, t in p.get("chips", []))
    yts = [m for m in p.get("media", []) if m[0] == "yt"]
    actions = []
    if yts: actions.append(f'<a class="btn" href="#media">Watch the video {ARROW}</a>')
    elif p.get("media"): actions.append(f'<a class="btn" href="#media">See the gallery {ARROW}</a>')
    if p.get("itch"): actions.append(f'<a class="btn btn--ghost" href="{E(p["itch"])}" rel="noopener">Play on itch.io</a>')
    docs = p.get("docs", [])
    if docs and not p.get("itch"): actions.append(f'<a class="btn btn--ghost" href="#docs">Read the documents</a>')

    out = [head(p["title"], p["desc"], hero or "images/site/arms-range.jpg", slug).replace("SLUG", slug)]
    out.append(f"""
	<main id="main">
		<section class="phero" id="top" aria-labelledby="page-title">
			{img_tag}
			<div class="hero__frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
			<div class="wrap phero__content">
				<a class="back reveal" href="index.html#projects">{BACK} All projects</a>
				<p class="label reveal" style="--d:1">{E(p["kicker"])}</p>
				<h1 class="title phero__title reveal" id="page-title" style="--d:1">{E(p["title"])}</h1>
				<p class="phero__lede reveal" style="--d:2">{E(p["lede"])}</p>
				{f'<div class="phero__chips reveal" style="--d:2">{chips}</div>' if chips else ''}
				<div class="phero__actions reveal" style="--d:3">{''.join(actions)}</div>
			</div>
		</section>
""")
    # facts strip
    cells = []
    for f in p["facts"]:
        label, value = f[0], f[1]
        bar = f'<div class="grade__bar"><span style="--v:{f[2]}%"></span></div>' if len(f) > 2 else ""
        cells.append(f'<div class="fact reveal{" grade" if bar else ""}"><dt>{E(label)}</dt><dd>{E(value)}</dd>{bar}</div>')
    out.append(f"""
		<section class="facts" aria-label="Project facts">
			<dl class="wrap facts__grid">{''.join(cells)}</dl>
		</section>
""")
    n = 0
    # why: the reason the project exists (plus an optional status panel)
    n += 1
    aside = ""
    if p.get("aside"):
        a = p["aside"]
        aside = f'<aside class="panel reveal" style="--d:1"><span class="label">{E(a["label"])}</span>' + "".join(f"<p>{E(x)}</p>" for x in a["ps"]) + "</aside>"
    body = f'				<div class="overview{"" if aside else " overview--solo"}">{paras(p["why"])}{aside}</div>'
    out.append(section(n, "Why", "Why I made it", body, "why"))
    # how: process and decisions, with the toolkit beside it
    n += 1
    how = p["how"]
    tools = "".join(f'<li class="chip">{E(t)}</li>' for t in how.get("tools", []))
    panel = f'<aside class="panel reveal" style="--d:1"><span class="label">Built with</span><ul class="tags">{tools}</ul></aside>' if tools else ""
    body = f'				<div class="overview{"" if panel else " overview--solo"}">{paras(how["ps"])}{panel}</div>'
    out.append(section(n, "How", "How I built it", body, "how"))
    # play: a mini game rebuilt from the project, right on its page
    if p.get("play"):
        n += 1
        pl = p["play"]
        body = f'				<div class="play"><div class="play__text reveal">' + "".join(f"<p>{E(x)}</p>" for x in pl["ps"]) + f'</div><div class="arcade reveal" style="--d:1" data-game="{pl["game"]}"><p>This mini game needs JavaScript turned on.</p></div></div>'
        out.append(section(n, "Play", pl["title"], body, "play"))
    # media
    if p.get("media"):
        n += 1
        thumbs = []
        for k, m in enumerate(p["media"]):
            if m[0] == "yt":
                thumbs.append(f'<a class="viewer__thumb is-video" href="https://www.youtube.com/watch?v={m[1]}" data-yt="{m[1]}" data-full="{yt_full(m[1])}" data-label="{E(m[2])}" aria-label="Show video: {E(m[2])}"><img src="{yt_thumb(m[1])}" alt="" loading="lazy" /></a>')
            else:
                full = web(m[1], 1600); th = web(m[1], 480, "-t")
                thumbs.append(f'<a class="viewer__thumb" href="{E(full)}" data-full="{E(full)}" data-label="{E(m[2])}" aria-label="Show image: {E(m[2])}"><img src="{E(th)}" alt="" loading="lazy" /></a>')
        first = p["media"][0]
        first_img = yt_full(first[1]) if first[0] == "yt" else web(first[1], 1600)
        body = f"""				<div class="viewer reveal" data-viewer>
					<div class="viewer__stage"><img src="{E(first_img)}" alt="{E(first[2])}" /></div>
					<div class="viewer__bar"><span class="viewer__caption">{E(first[2])}</span><span>{len(p['media'])} item{'s' if len(p['media']) != 1 else ''}</span></div>
					{f'<div class="viewer__thumbs">{"".join(thumbs)}</div>' if len(thumbs) > 1 else ''}
				</div>"""
        out.append(section(n, "Media", "Gallery", body, "media"))
    # extra sections, in order
    for s in p.get("sections", []):
        n += 1
        kind = s["kind"]
        if kind == "prose":
            body = f'				<div class="overview overview--solo">{paras(s["ps"])}</div>'
        elif kind == "systems":
            items = "".join(f'<div class="system reveal" style="--d:{k % 3}"><p class="system__num">{k + 1:02d}</p><h3>{E(t)}</h3><p>{E(d)}</p></div>' for k, (t, d) in enumerate(s["items"]))
            body = f'				<div class="systems">{items}</div>'
        elif kind == "list":
            body = '				<ul class="features__list reveal">' + "".join(f"<li>{E(x)}</li>" for x in s["items"]) + "</ul>"
        elif kind == "details":
            rows = "".join(f"<dt>{E(a)}</dt><dd>{E(b)}</dd>" for a, b in s["items"])
            body = f'				<div class="details reveal"><div class="details__head"><span>Details</span><span>{len(s["items"])} properties</span></div><dl>{rows}</dl></div>'
        out.append(section(n, s["label"], s["title"], body))
    if docs:
        n += 1
        cards = "".join(f'<article class="doc reveal" style="--d:{k}"><span class="doc__icon">PDF</span><div><h3 class="doc__title"><a href="{E(path)}" target="_blank" rel="noopener">{E(t)}</a></h3><p class="doc__meta">Opens in a new tab</p></div></article>' for k, (t, path) in enumerate(docs))
        out.append(section(n, "Documents", "Read the docs", f'				<div class="docs">{cards}</div>', "docs"))
    # next project
    nslug, np = nxt
    nimg = web(np["hero"], 1920) if np.get("hero") else ""
    out.append(f"""
		<section class="section" aria-label="Next project">
			<div class="wrap">
				<a class="next reveal" href="{nslug}.html">
					{f'<img src="{E(nimg)}" alt="" loading="lazy" />' if nimg else ''}
					<p class="label">Next project</p>
					<p class="title next__title">{E(np["title"])} {ARROW}</p>
					<p class="next__text">{E(np["lede"])}</p>
				</a>
			</div>
		</section>
""")
    foot = FOOT
    if p.get("play"):
        foot = foot.replace('<script src="assets/secrets.js?v=2026101911" defer></script>', f'<script src="assets/secrets.js?v=2026101911" defer></script>\n\t<script src="assets/games/{p["play"]["game"]}.js?v=2026101911" defer></script>')
    out.append(foot)
    return "".join(out)


exec(open(pathlib.Path(__file__).with_name("projects_data.py"), encoding="utf-8").read())

order = list(PROJECTS)
for i, slug in enumerate(order):
    if ONLY and slug not in ONLY: continue
    nxt = order[(i + 1) % len(order)]
    page = render(slug, PROJECTS[slug], (nxt, PROJECTS[nxt]))
    (ROOT / f"{slug}.html").write_text(page, encoding="utf-8", newline="\n")
    print("built", slug)
