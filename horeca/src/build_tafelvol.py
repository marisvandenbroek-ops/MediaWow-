"""Inline images into the Tafelvol page so it works as one self-contained file."""
import base64, pathlib
here = pathlib.Path(__file__).resolve().parent.parent
html = (here / 'src' / 'tafelvol.template.html').read_text()
def uri(path, mime):
    return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode()
html = html.replace('{{IMG_MARISKA}}', uri(here / 'img' / 'mariska.jpg', 'image/jpeg'))
html = html.replace('{{IMG_LILOU_D}}', uri(here / 'img' / 'lilou-desktop.jpg', 'image/jpeg'))
html = html.replace('{{IMG_LILOU_M}}', uri(here / 'img' / 'lilou-mobiel.jpg', 'image/jpeg'))
html = html.replace('{{IMG_MARK}}', uri(here / 'img' / 'mark-minkman.jpg', 'image/jpeg'))
for i in range(1, 15):
    html = html.replace('{{LOGO_%02d}}' % i, uri(here / 'img' / 'logos' / f'{i:02d}.png', 'image/png'))
assert '{{' not in html, 'unfilled placeholder'
(here / 'tafelvol.html').write_text(html)
print('written', len(html) // 1024, 'KB')
