"""Builds fioridirose-kit/data/home.json: the homepage as Elementor container data.

Tokens such as {{url:winkel}}, {{id:winkel}}, {{cat:zijde}} and {{ids:journal}} are filled in
by the plugin installer once the images and categories exist in WordPress.

Run: python3 tools/build_home_json.py
"""
import json
import os
import random

random.seed(20261030)  # stable element ids between builds
_used = set()


def eid():
    while True:
        v = "%07x" % random.getrandbits(28)
        if v not in _used:
            _used.add(v)
            return v


ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6"/></svg>'
ZERO = {"unit": "px", "top": "0", "right": "0", "bottom": "0", "left": "0", "isLinked": True}


def con(cls, children, tag="div", direction="column", anchor=None, inner=True):
    s = {
        "content_width": "full",
        "flex_direction": direction,
        "css_classes": cls,
        "html_tag": tag,
        "padding": ZERO,
        "flex_gap": {"unit": "px", "size": 0, "column": "0", "row": "0", "isLinked": True},
    }
    if anchor:
        s["_element_id"] = anchor
    return {"id": eid(), "elType": "container", "isInner": inner, "settings": s, "elements": children}


def section(cls, children, anchor=None, direction="column"):
    return con("fdr-sec " + cls, children, tag="section", direction=direction, anchor=anchor, inner=False)


def widget(kind, settings):
    return {"id": eid(), "elType": "widget", "widgetType": kind, "settings": settings, "elements": []}


def heading(text, tag, cls=""):
    return widget("heading", {"title": text, "header_size": tag, "_css_classes": cls})


def text(html, cls=""):
    return widget("text-editor", {"editor": html, "_css_classes": cls})


def html(code, cls=""):
    return widget("html", {"html": code, "_css_classes": cls})


def image(key, cls, alt):
    return widget("image", {
        "image": {"url": "{{url:%s}}" % key, "id": "{{id:%s}}" % key, "alt": alt, "source": "library", "size": ""},
        "image_size": "full",
        "_css_classes": cls,
    })


def shortcode(code, cls=""):
    return widget("shortcode", {"shortcode": code, "_css_classes": cls})


def tline(label, href, arrow=True, extra=""):
    return '<a href="%s" class="fdr-tline"%s>%s%s</a>' % (href, extra, label, (" " + ARROW) if arrow else "")


CREDIT = '<span class="fdr-credit-text">Foto &middot; Daan van Oort Photography</span>'

home = [
    section("fdr-hero", [
        image("winkel", "fdr-hero-img", "Interieur van de winkel: bloemen, ballonnen en de iriserende toonbank"),
        con("fdr-wrap fdr-hero-copy", [
            heading("Bloemen &middot; Zijde &middot; Interieur", "div", "fdr-label"),
            heading("De kunst van <em>overvloed</em>", "h1", "fdr-display fdr-h1"),
            text("<p>Verse en zijden bloemen, vazen en interieurstukken. Elk stuk samengesteld in ons atelier, nu ook bij jou thuis.</p>", "fdr-hero-p"),
            html('<div class="fdr-links">' + tline("Ontdek de collectie", "#collectie") + tline("Atelier op maat", "#atelier", False) + "</div>"),
        ]),
        html(CREDIT, "fdr-credit"),
    ]),

    section("fdr-intro", [
        con("fdr-wrap fdr-intro-grid", [
            heading("Het huis", "div", "fdr-label fdr-rv"),
            con("fdr-intro-body fdr-rv", [
                heading("Geen boeketten van de band, maar arrangementen met <em>karakter</em>. Uitbundig waar het mag, verfijnd waar het moet, en altijd met de hand gemaakt.", "p", "fdr-display fdr-intro-text"),
                text("<p>Zijden bloemen die blijven, verse bloemen voor het moment, en de vaas die het af maakt.</p>", "fdr-intro-sig"),
            ]),
        ]),
    ]),

    section("fdr-signature", [
        con("fdr-wrap", [
            con("fdr-head-row fdr-rv", [
                heading("Signature <em>zijde</em>", "h2", "fdr-display fdr-h2-xl"),
                html(tline("Alle zijden arrangementen", "{{cat:zijde}}")),
            ], direction="row"),
            shortcode("[fdr_signature]"),
        ]),
    ]),

    section("fdr-stone fdr-collections", [
        con("fdr-wrap", [
            con("fdr-head-row fdr-rv", [
                heading("Collecties", "h2", "fdr-display"),
                heading("Vier werelden, één huis", "div", "fdr-label"),
            ], direction="row"),
            shortcode('[fdr_collections slugs="verse-bloemen,zijde,vazen,interieur"]'),
        ]),
    ], anchor="collectie"),

    section("fdr-stone fdr-shop", [
        con("fdr-wrap", [shortcode('[fdr_products title_pre="De" title_em="selectie" limit="8"]')]),
    ], anchor="shop"),

    section("fdr-atelier-sec", [
        con("fdr-wrap", [shortcode("[fdr_atelier]")]),
    ], anchor="atelier"),

    section("fdr-stone fdr-store", [
        con("fdr-store-fig", [
            image("toonbank", "fdr-store-img", "De iriserende toonbank en hangende planten in de winkel"),
            html(CREDIT, "fdr-credit"),
        ]),
        con("fdr-store-txt fdr-rv", [
            heading("De winkel", "div", "fdr-label"),
            heading("Staal, glas en <em>duizend bloemen</em>", "h2", "fdr-display"),
            text("<p>Hangende groene wolken, een toonbank die van kleur verschiet en bloemen tot aan het plafond. Onze winkel is een plek om te kijken, te ruiken en je te laten verrassen.</p>"
                 "<p>Wat je online ziet, is samengesteld door hetzelfde team. Liever zelf uitzoeken? Je bent van harte welkom.</p>", "fdr-store-p"),
            html(tline("Route en openingstijden", "#contact")),
        ]),
    ], anchor="winkel", direction="row"),

    section("fdr-services", [
        con("fdr-wrap", [
            con("fdr-head-row fdr-rv", [heading("Service", "h2", "fdr-display")], direction="row"),
            con("fdr-svc-grid", [
                con("fdr-svc fdr-rv", [heading("Bezorging aan huis", "h3", "fdr-svc-title"), text("<p>Op de dag die jij kiest, zorgvuldig verpakt en met een handgeschreven kaart.</p>")]),
                con("fdr-svc fdr-rv", [heading("Atelier op maat", "h3", "fdr-svc-title"), text("<p>Voor een bijzondere plek of moment stellen we een arrangement samen dat precies past.</p>")]),
                con("fdr-svc fdr-rv", [heading("Zakelijk", "h3", "fdr-svc-title"), text("<p>Zijden en verse arrangementen voor hotels, restaurants en kantoren, ook als abonnement.</p>")]),
            ], direction="row"),
        ]),
    ]),

    section("fdr-journal", [
        con("fdr-wrap", [
            con("fdr-head-row fdr-rv", [
                heading("Journal", "h2", "fdr-display"),
                html(tline("@fioridirose", "https://www.instagram.com/fioridirose", extra=' target="_blank" rel="noopener"')),
            ], direction="row"),
        ]),
        shortcode('[fdr_journal ids="{{ids:journal}}" url="https://www.instagram.com/fioridirose"]'),
    ]),

    section("fdr-stone fdr-news", [
        con("fdr-wrap fdr-rv", [
            heading("Nieuwsbrief", "div", "fdr-label"),
            heading("Als eerste de <em>nieuwe collectie</em>", "h2", "fdr-display"),
            text("<p>Eén keer per week de mooiste nieuwe stukken, voordat ze in de winkel weg zijn.</p>", "fdr-news-p"),
            shortcode("[fdr_newsletter]"),
        ]),
    ]),
]

out = os.path.join(os.path.dirname(__file__), "..", "fioridirose-kit", "data", "home.json")
with open(out, "w", encoding="utf-8") as f:
    json.dump(home, f, ensure_ascii=False, indent=1)
print("wrote", os.path.normpath(out), len(_used), "elements")
