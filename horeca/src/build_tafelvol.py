"""Build the horeca sales page as self-contained HTML files.

Outputs:
  tafelvol.html          free design (Tafelvol brand, black + yellow)
  mediawow-horeca.html   same page in the MediaWow house style (src/mediawow-style.css)

Run: python3 src/build_tafelvol.py
"""
import base64
import pathlib

here = pathlib.Path(__file__).resolve().parent.parent
src = here / 'src'


def uri(path, mime):
    return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode()


def fill_images(html):
    html = html.replace('{{IMG_MARISKA}}', uri(here / 'img' / 'mariska.jpg', 'image/jpeg'))
    html = html.replace('{{IMG_LILOU_D}}', uri(here / 'img' / 'lilou-desktop.jpg', 'image/jpeg'))
    html = html.replace('{{IMG_LILOU_M}}', uri(here / 'img' / 'lilou-mobiel.jpg', 'image/jpeg'))
    html = html.replace('{{IMG_MARK}}', uri(here / 'img' / 'mark-minkman.jpg', 'image/jpeg'))
    for i in range(1, 15):
        html = html.replace('{{LOGO_%02d}}' % i, uri(here / 'img' / 'logos' / f'{i:02d}.png', 'image/png'))
    return html


FONTS_FREE = ('<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@112,700;112,800;112,900'
              '&family=Instrument+Serif:ital@1&family=Hanken+Grotesk:wght@400;500;600;700'
              '&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">')
FONTS_MW = ('<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1'
            '&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600'
            '&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">')
BRAND_FREE = '<a class="brand" href="#top"><b>Tafel<i>vol</i></b><small>door MediaWow · alleen horeca</small></a>'


def mediawow_variant(html):
    assert FONTS_FREE in html and BRAND_FREE in html
    html = html.replace('<title>Tafelvol</title>', '<title>MediaWow Horeca</title>', 1)
    html = html.replace(FONTS_FREE, FONTS_MW, 1)
    style = (src / 'mediawow-style.css').read_text()
    i = html.index('</style>')
    html = html[:i] + '\n' + style + html[i:]
    brand = ('<a class="brand" href="#top"><img src="{{LOGO_MW}}" alt="MediaWow Webdesign" width="122" height="30">'
             '<small>Horeca</small></a>')
    html = html.replace(BRAND_FREE, brand, 1)
    html = html.replace('{{LOGO_MW}}', uri(here / 'mediawow-logo.png', 'image/png'))
    return html


template = (src / 'tafelvol.template.html').read_text()
outputs = {'tafelvol.html': template, 'mediawow-horeca.html': mediawow_variant(template)}
for name, html in outputs.items():
    html = fill_images(html)
    assert '{{' not in html, f'unfilled placeholder in {name}'
    (here / name).write_text(html)
    print('written', name, len(html) // 1024, 'KB')
