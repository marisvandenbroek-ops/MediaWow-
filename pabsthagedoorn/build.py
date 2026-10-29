"""Bouwt de Pabst & Hagedoorn site uit src/ naar:
   - ./*.html            preview (claude.ai artifact, relatieve links)
   - ./elementor/*.html  blokken om in een Elementor HTML-widget te plakken
Pas WP_IMG en WP_LINKS aan als de WordPress-site andere paden gebruikt."""
import re, pathlib
HERE = pathlib.Path(__file__).parent
SRC = HERE / 'src'

WP_IMG = '/wp-content/uploads/pabsthagedoorn/'
WP_LINKS = {'home': '/', 'collectie': '/collectie/', 'product': '/product/', 'inspiratie': '/inspiratie/',
            'samenstellen': '/servies-samenstellen/', 'showrooms': '/showrooms-contact/'}
PREVIEW_LINKS = {'home': 'index.html', 'collectie': 'collectie.html', 'product': 'product.html', 'inspiratie': 'inspiratie.html',
                 'samenstellen': 'servies-samenstellen.html', 'showrooms': 'showrooms-contact.html'}
PAGES = [  # key, source, title, description
    ('home', 'home.html', 'Pabst & Hagedoorn Shop', 'Serax bij Pabst & Hagedoorn'),
    ('collectie', 'collectie.html', 'Collectie Serax | Pabst & Hagedoorn', 'Alle Serax-artikelen per doos'),
    ('product', 'product.html', 'Product | Pabst & Hagedoorn', 'Serax productpagina'),
    ('inspiratie', 'inspiratie.html', 'Inspiratie | Pabst & Hagedoorn', 'Lookbook Serax'),
    ('samenstellen', 'samenstellen.html', 'Servies samenstellen | Pabst & Hagedoorn', 'Couvert samenstellen per zaal'),
    ('showrooms', 'showrooms.html', 'Showrooms & contact | Pabst & Hagedoorn', 'Showrooms en afspraak maken'),
]
FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@300;400;500;600&display=swap" rel="stylesheet">'

def prefix_sel(sel):
    sel = sel.strip()
    if sel in (':root', 'body', 'html'):
        return '#ph'
    return '#ph ' + sel

def scope(css, depth=0):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    out, i = [], 0
    while i < len(css):
        j = css.find('{', i)
        if j < 0:
            break
        head = css[i:j].strip()
        # find matching brace
        k, lvl = j + 1, 1
        while lvl:
            lvl += {'{': 1, '}': -1}.get(css[k], 0); k += 1
        body = css[j + 1:k - 1]
        if head.startswith('@media') or head.startswith('@supports'):
            out.append(head + '{' + scope(body, depth + 1) + '}')
        elif head.startswith('@'):
            out.append(head + '{' + body + '}')
        else:
            out.append(','.join(prefix_sel(s) for s in head.split(',')) + '{' + body.strip() + '}')
        i = k
    return '\n'.join(out)

def fill(text, links, img):
    text = re.sub(r'\{\{L:(\w+)\}\}', lambda m: links[m.group(1)], text)
    return text.replace('{{IMG}}', img)

# ASCII-only output: safe to paste anywhere, whatever charset the host page declares
ascii_js = lambda t: re.sub(r'[^\x00-\x7f]', lambda m: '\\u%04x' % ord(m.group()), t)
ascii_html = lambda t: re.sub(r'[^\x00-\x7f]', lambda m: '&#x%x;' % ord(m.group()), t)
css = scope((SRC / 'style.css').read_text())
js = ascii_js((SRC / 'app.js').read_text())
head, foot = ascii_html((SRC / 'header.html').read_text()), ascii_html((SRC / 'footer.html').read_text())

def body(key, src, links, img):
    inner = head + ascii_html((SRC / src).read_text()) + foot
    return fill(f'<div id="ph" data-page="{key}">\n{inner}</div>\n<script>\n{js}</script>\n', links, img)

(HERE / 'elementor').mkdir(exist_ok=True)
for key, src, title, desc in PAGES:
    style = f'<style>\n{css}\n</style>\n'
    name = PREVIEW_LINKS[key]
    meta = f'<title>{title.replace("&", "&amp;")}</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<meta name="robots" content="noindex, nofollow">\n<meta name="description" content="{desc}">\n'
    page = meta + FONTS + '\n' + style + '<style>body{margin:0;background:#ebe7e0}</style>\n' + body(key, src, PREVIEW_LINKS, 'img/')
    if key != 'home':  # extra artifact pages need their own document skeleton
        page = '<!doctype html>\n<html lang="nl">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + page.replace('<div id="ph"', '</head>\n<body>\n<div id="ph"', 1) + '</body>\n</html>\n'
    (HERE / name).write_text(page)
    snippet = f'<!-- Pabst & Hagedoorn - {title} - plak dit in een Elementor HTML-widget -->\n' + FONTS + '\n' + style + body(key, src, WP_LINKS, WP_IMG)
    (HERE / 'elementor' / name.replace('index.html', 'home.html')).write_text(snippet)
print('ok')
