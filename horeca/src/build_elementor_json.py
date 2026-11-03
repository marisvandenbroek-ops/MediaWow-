"""Turn mediawow-horeca.html into an Elementor page template (JSON) for Templates > Import.

Structure of the template:
  container #mw-horeca (full width, no padding)
    container "Stijl"          HTML widget: Google Fonts + all CSS, scoped to #mw-horeca
    container "<section name>" HTML widget per page section (hero, rekensom, Lilou, prijs, ...)
    container "Script"         HTML widget: sticky mobile button + the page script

Meant for the Elementor Canvas template: no site menu, only the page's own slim header (logo + 'Gratis scan') and footer.
All CSS is prefixed with #mw-horeca so theme and Elementor kit styles cannot override it.

Run after build_tafelvol.py:  python3 src/build_elementor_json.py
"""
import json
import pathlib
import random
import re
from html.parser import HTMLParser

here = pathlib.Path(__file__).resolve().parent.parent
SCOPE = '#mw-horeca'
random.seed(20261103)
_used = set()


def eid():
    while True:
        v = '%07x' % random.getrandbits(28)
        if v not in _used:
            _used.add(v)
            return v


# ---------- CSS scoping ----------
def split_blocks(css):
    """Yield (prelude, body) for each top-level rule; body is None for statements like @import."""
    i, n = 0, len(css)
    while i < n:
        j = css.find('{', i)
        k = css.find(';', i)
        if j == -1:
            break
        if k != -1 and k < j and css[i:k].strip().startswith('@'):
            yield css[i:k].strip(), None
            i = k + 1
            continue
        depth, m = 0, j
        while m < n:
            if css[m] == '{':
                depth += 1
            elif css[m] == '}':
                depth -= 1
                if depth == 0:
                    break
            m += 1
        yield css[i:j].strip(), css[j + 1:m]
        i = m + 1


def split_selectors(prelude):
    out, depth, cur = [], 0, ''
    for ch in prelude:
        if ch in '([':
            depth += 1
        elif ch in ')]':
            depth -= 1
        if ch == ',' and depth == 0:
            out.append(cur.strip())
            cur = ''
        else:
            cur += ch
    if cur.strip():
        out.append(cur.strip())
    return out


def scope_selector(sel):
    if sel.startswith('body::before'):
        return None  # safe-area band for the standalone page only
    if sel.startswith(':root'):
        return SCOPE + sel[len(':root'):]
    if sel == 'html' or sel.startswith('body'):
        return SCOPE + sel[4:] if sel.startswith('body') else SCOPE
    return f'{SCOPE} {sel}'


def scope_css(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    out = []
    for prelude, body in split_blocks(css):
        if body is None:
            continue
        if prelude.startswith('@media') or prelude.startswith('@supports'):
            out.append(prelude + '{' + scope_css(body) + '}')
        elif prelude.startswith('@'):
            out.append(prelude + '{' + body + '}')  # @keyframes, @font-face: unchanged
        else:
            sels = [s for s in (scope_selector(x) for x in split_selectors(prelude)) if s]
            if sels:
                out.append(','.join(sels) + '{' + body.strip() + '}')
    return '\n'.join(out)


ELEMENTOR_GUARD = f'''
{SCOPE}{{display:block;width:100%;background:var(--paper);color:var(--ink);font-family:var(--body);overflow-x:clip}}
{SCOPE} .e-con,{SCOPE}.e-con{{--padding-top:0px;--padding-right:0px;--padding-bottom:0px;--padding-left:0px;--gap:0px;--row-gap:0px;--column-gap:0px;padding:0!important;gap:0!important;max-width:none!important}}
{SCOPE} .elementor-widget,{SCOPE} .elementor-widget-container{{margin:0!important;padding:0!important;width:100%}}
{SCOPE} :where(h1,h2,h3,h4,h5,h6){{color:inherit;font-family:inherit;font-size:inherit;font-weight:inherit;line-height:inherit;letter-spacing:inherit;text-transform:none;margin:0;padding:0}}
{SCOPE} :where(p,ul,ol,li,figure,blockquote,label,span,summary,small){{color:inherit;margin:0;padding:0}}
{SCOPE} :where(a){{color:inherit}}
{SCOPE} img{{border:0}}
{SCOPE}>.mw-top-wrap{{position:sticky;top:var(--wp-admin--admin-bar--height,0px);z-index:60}}
{SCOPE} :where(a){{text-decoration:none}}
{SCOPE} :where(button,[type=button],[type=submit]):hover,{SCOPE} :where(button,[type=button],[type=submit]):focus{{background-color:revert-layer}}
{SCOPE} *,{SCOPE} *::before,{SCOPE} *::after{{box-sizing:border-box}}
{SCOPE} img{{max-width:100%;height:auto}}
'''


# ---------- HTML splitting ----------
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}


class TopLevel(HTMLParser):
    """Find the start/end offsets of each top-level element inside a fragment."""

    def __init__(self, text):
        super().__init__(convert_charrefs=False)
        self.text, self.depth, self.parts, self.start = text, 0, [], None
        self.lines = [0]
        for line in text.splitlines(keepends=True):
            self.lines.append(self.lines[-1] + len(line))

    def pos(self):
        line, col = self.getpos()
        return self.lines[line - 1] + col

    def handle_starttag(self, tag, attrs):
        if self.depth == 0:
            self.start = (self.pos(), tag, dict(attrs))
        if tag not in VOID:
            self.depth += 1
        elif self.depth == 0:
            self.parts.append((self.start, self.pos() + len(self.get_starttag_text())))

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        self.depth -= 1
        if self.depth == 0:
            end = self.text.index('>', self.pos()) + 1
            self.parts.append((self.start, end))


NAMES = {
    'hero': 'Hero + live telefoon', 'marquee': 'Horeca-band', 'works': 'Werkt met',
    'rekening': 'Rekensom', 'lilou': 'Lilou (echte case)', 'resultaten': 'Voorbeeldcases',
    'aanbod': 'Prijs: de kaart', 'faq': 'Veelgestelde vragen', 'scan': 'Gratis scan + formulier',
    'proof': 'Google-reviews',
}


def label(tag, attrs, html):
    key = attrs.get('id') or (attrs.get('class') or '').split(' ')[0]
    if key in NAMES:
        return NAMES[key]
    for needle, name in [('Wat er gebeurt terwijl', 'Verhaal: 18:41'), ('De Tafelvol-methode', 'Gevonden, gekozen, geboekt'),
                         ('Zie het zelf', 'Voor/na-telefoon'), ('Wie bouwt jouw website', 'Over Mariska + logo\'s'),
                         ('Eerlijk is eerlijk', 'Voor wie wel/niet'), ('Nog twijfels', 'Veelgestelde vragen')]:
        if needle in html:
            return name
    return key or tag


def container(children, title=None, css_class='', element_id=None, inner=True):
    s = {'content_width': 'full', 'flex_direction': 'column', 'css_classes': css_class,
         'padding': {'unit': 'px', 'top': '0', 'right': '0', 'bottom': '0', 'left': '0', 'isLinked': True},
         'flex_gap': {'unit': 'px', 'size': 0, 'column': '0', 'row': '0', 'isLinked': True}}
    if title:
        s['_title'] = title
    if element_id:
        s['_element_id'] = element_id
    return {'id': eid(), 'elType': 'container', 'isInner': inner, 'settings': s, 'elements': children}


def html_widget(code, title):
    return {'id': eid(), 'elType': 'widget', 'widgetType': 'html', 'settings': {'html': code, '_title': title}, 'elements': []}


UPLOADS = 'https://mediawow.nl/wp-content/uploads/2026/10/'
LOGO_URLS = ['logo-winstallatie-1-1.png', 'logo-luvely-1-1.png', 'logo-house-of-brave-leaders-1-1.png', 'logo-peter-looijen-1-1.png',
             'logo-tim-kruik-hairstudio-1-1.png', 'logo-ge-stipt-1-1.png', 'logo-brand-veilig-1-1.png', 'logo-browz-amsterdam-1-1.png',
             'logo-an-security-1-1.png', 'logo-an-groep-nederland-1-1.png', 'logo-tuinkantoren-1-1.png', 'logo-oranjedag-rhenen-1-1.png',
             'logo-hairstyling-stormer-1-1.png', 'logo-studio-bellai-1-1.png']


def lighten(page):
    """Replace inlined images with images already on mediawow.nl, so the template is small enough to paste."""
    import base64

    def data(path, mime):
        return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode()

    swaps = {data(here / 'img' / 'mariska.jpg', 'image/jpeg'): UPLOADS + '0D65D621-A574-4948-81C3-111563D7499C-600x750-2-1.png',
             data(here / 'img' / 'mark-minkman.jpg', 'image/jpeg'): UPLOADS + 'mw-mockup-mark-minkman-1.jpg',
             data(here / 'mediawow-logo.png', 'image/png'): UPLOADS + '1-3-600x133-2-4.png'}
    for i, name in enumerate(LOGO_URLS, 1):
        swaps[data(here / 'img' / 'logos' / f'{i:02d}.png', 'image/png')] = UPLOADS + name
    for k, v in swaps.items():
        assert k in page, v
        page = page.replace(k, v)
    # Lilou: the live-site screenshots are not hosted, so show the Lilou mockup from mediawow.nl instead
    start = page.index('<div class="shots">')
    end = page.index('<span class="callout">', start)
    page = page[:start] + ('<div class="shots"><img class="mock" src="' + UPLOADS + 'mw-mockup-lilou-1.jpg" '
                           'alt="Website van restaurant Lilou in Ede op een laptop" width="1200" height="1200" loading="lazy">\n        ') + page[end:]
    page = page.replace('</style>', '.shots .mock{width:100%;border-radius:6px;display:block}\n</style>', 1)
    assert 'data:image' not in page.replace('data:image/svg', ''), 'inlined raster image left'
    return page


def main(light=False):
    page = (here / 'mediawow-horeca.html').read_text()
    if light:
        page = lighten(page)
    fonts = re.search(r'<link href="https://fonts\.googleapis\.com/css2[^>]+>', page).group(0)
    css = '\n'.join(re.findall(r'<style>(.*?)</style>', page, flags=re.S))
    scoped = ELEMENTOR_GUARD + scope_css(css)
    main_html = re.search(r'<main id="top" lang="nl">(.*)</main>', page, flags=re.S).group(1)
    header = re.search(r'<header class="top">.*?</header>', page, flags=re.S).group(0)
    footer = re.search(r'<footer>.*?</footer>', page, flags=re.S).group(0)
    sticky = re.search(r'<div class="sticky" id="sticky">.*?</div>', page, flags=re.S).group(0)
    script = re.search(r'<script>(.*?)</script>', page, flags=re.S).group(1)

    parser = TopLevel(main_html)
    parser.feed(main_html)
    sections = []
    for (start, tag, attrs), end in parser.parts:
        chunk = main_html[start:end]
        sections.append(container([html_widget(chunk, label(tag, attrs, chunk))], title=label(tag, attrs, chunk)))

    children = [container([html_widget(fonts + '\n<style>' + scoped + '</style>', 'Stijl (niet aanpassen)')], title='Stijl'),
                container([html_widget(header, 'Kop: logo + Gratis scan')], title='Kop (blijft staan)', css_class='mw-top-wrap')]
    children += sections
    children.append(container([html_widget(footer, 'Footer')], title='Footer'))
    children.append(container([html_widget(sticky + '\n<script>' + script + '</script>', 'Script (niet aanpassen)')], title='Script'))
    root = container(children, title='MediaWow Horeca', css_class='mw-horeca', element_id='mw-horeca', inner=False)

    template = {
        'version': '0.4',
        'title': 'MediaWow Horeca',
        'type': 'page',
        'page_settings': {'template': 'elementor_canvas', 'hide_title': 'yes'},
        'content': [root],
    }
    out = here / 'elementor' / ('mediawow-horeca-licht.json' if light else 'mediawow-horeca.json')
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(template, ensure_ascii=False, indent=1))
    print('written', out.relative_to(here), out.stat().st_size // 1024, 'KB,', len(sections), 'sections:')
    for s in sections:
        print('  -', s['settings']['_title'])


if __name__ == '__main__':
    main()
    main(light=True)
