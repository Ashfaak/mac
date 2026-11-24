"""Build the public copy in docs/ from the private originals (index.html, listings.json).

The public copy drops seller usernames, locations, thread titles/links, free-text notes and the
per-listing table. The statistics section is part of the original page and is kept. Run from this folder:  python build_public.py
"""
import json, re, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "docs")
os.makedirs(OUT, exist_ok=True)

# ---------- data ----------
KEEP = ["date", "type", "model", "chip", "gen", "tier", "screen", "ram", "storage", "cpu_cores", "gpu_cores",
        "year", "battery_health", "cycles", "asking_price", "final_price", "sold", "condition", "damage_severity",
        "seller_type", "gb_single", "gb_multi", "gb_metal", "gb_opencl", "gb_config", "gb_match"]
J = json.load(open(os.path.join(HERE, "listings.json"), encoding="utf-8"))
listings = sorted(({k: d.get(k) for k in KEEP} for d in J["listings"]), key=lambda d: d["date"], reverse=True)
pub = {"scraped": J["scraped"], "method": J["method"], "benchmarks": J["benchmarks"],
       "privacy": "Seller usernames, locations, thread titles and links, and free-text notes are not included.",
       "listings": listings}
json.dump(pub, open(os.path.join(OUT, "data.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

# ---------- page ----------
s = open(os.path.join(HERE, "index.html"), encoding="utf-8").read()

def rep(a, b, count=1):
    global s
    n = s.count(a)
    assert n == count, (n, a[:80])
    s = s.replace(a, b)

def rsub(pat, b):
    global s
    s2, n = re.subn(pat, lambda m: b, s, flags=re.S)
    assert n >= 1, pat[:80]
    s = s2

rep('<meta charset="utf-8">\n', '<!doctype html>\n<html lang="en">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n')
rep("then a statistics section and a dense sortable ledger. */", "then a statistics section. */")
rep("and Geekbench scores.</p>",
    "and Geekbench scores. This public copy leaves out seller names, locations, thread titles and links, and the per-listing table.</p>")
# text search (searched titles and notes, which are no longer published)
rep('      <div class="fg"><label for="f-q">Search titles &amp; notes</label><input type="search" id="f-q" placeholder="e.g. space black, applecare, dent"></div>\n', "")
rep('  const q = document.getElementById("f-q").value.trim().toLowerCase();\n  if(q && !q.split(/\\s+/).every(w => d._s.includes(w))) return false;\n', "")
rep('"f-gbg","f-q"]', '"f-gbg"]', 2)
rsub(r', statusTxt: d\.sold \? "Sold" : "~",\s*_s: \[.*?\]\.join\(" "\)\.toLowerCase\(\)\}\)\);', "}));")
# no thread links
rep(" Click a dot to open the thread.<span", "<span")
rep(" Click a dot to open the thread.</div>", "</div>")
rsub(r'\n  o\.onClick = \(e, els\) => \{[^\n]*\n', "\n")
rep("it[0].raw.d ? it[0].raw.d.title :", "it[0].raw.d ? lbl(it[0].raw.d) :", 2)
rep("const esc = s =>", 'const lbl = d => [d.model, d.screen ? d.screen + "″" : "", d.chip].filter(Boolean).join(" · ");\nconst esc = s =>')
# remove the per-listing table (the statistics section already lives in the original page)
rsub(r'\n  <section class="ledger".*?</section>\n', "\n")
rsub(r'function drawTable\(\)\{.*?document\.querySelectorAll\("#tbl th"\)\.forEach\(th => th\.onclick[^\n]*\n', "")
rep("drawStats(); drawTable();", "drawStats();")
rep('document.getElementById("pgsize").onchange = () => { page=0; drawTable(); };\n', "")
rsub(r'/\* ledger \*/.*?\.empty\{', ".tw{overflow-x:auto}\n.empty{")
rep('fetch("listings.json")', 'fetch("data.json")')
rep("Couldn't load listings.json", "Couldn't load data.json")
rep('esc(j.method) + (j.benchmarks', 'esc(j.method) + " " + esc(j.privacy || "") + (j.benchmarks')
for bad in ["drawTable", "d.title", "d.url", "d.location", "d.seller)", "f-q"]:
    assert bad not in s, bad
open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(s)
print("docs/index.html", len(s), "chars; docs/data.json", len(listings), "listings")
