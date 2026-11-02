"""Inline the images into the Tafelvol page so it works as one self-contained file."""
import base64, pathlib
here = pathlib.Path(__file__).resolve().parent.parent
html = (here / 'src' / 'tafelvol.template.html').read_text()
for key, name in {'HERO': 'hero', 'TERRACE': 'terrace', 'DISH': 'dish', 'PHONE': 'phone'}.items():
    data = base64.b64encode((here / 'img' / f'{name}.jpg').read_bytes()).decode()
    html = html.replace('{{IMG_%s}}' % key, 'data:image/jpeg;base64,' + data)
(here / 'tafelvol.html').write_text(html)
print('written', len(html) // 1024, 'KB')
