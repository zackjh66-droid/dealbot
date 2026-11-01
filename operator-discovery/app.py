import asyncio, json, os, subprocess, tempfile, time
from urllib.parse import quote_plus
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

app = FastAPI(title="OPERATOR Discovery", version="1.0")
SECRET = os.environ.get("OPERATOR_DISCOVERY_SECRET", "")
CACHE = {}

# Small rotating areas keep scans fast while still covering the UK over repeated runs.
REGIONS = [
    ("London", (-0.28, 51.43, 0.10, 51.60)),
    ("Birmingham", (-2.05, 52.39, -1.72, 52.57)),
    ("Manchester", (-2.38, 53.41, -2.10, 53.57)),
    ("Leeds", (-1.68, 53.73, -1.39, 53.88)),
    ("Liverpool", (-3.08, 53.34, -2.82, 53.49)),
    ("Bristol", (-2.72, 51.39, -2.47, 51.53)),
    ("Sheffield", (-1.62, 53.31, -1.34, 53.46)),
    ("Nottingham", (-1.27, 52.88, -1.02, 53.03)),
    ("Newcastle", (-1.75, 54.91, -1.47, 55.06)),
    ("Cardiff", (-3.31, 51.42, -3.05, 51.57)),
    ("Glasgow", (-4.38, 55.79, -4.12, 55.94)),
    ("Edinburgh", (-3.31, 55.89, -3.05, 56.01)),
    ("Leicester", (-1.24, 52.57, -1.02, 52.70)),
    ("Coventry", (-1.63, 52.35, -1.43, 52.47)),
    ("Derby", (-1.59, 52.86, -1.38, 52.99)),
    ("Southampton", (-1.52, 50.85, -1.30, 50.97)),
    ("Norwich", (1.18, 52.57, 1.42, 52.70)),
    ("Preston", (-2.83, 53.70, -2.57, 53.83)),
]

TRADE_TERMS = [
    "plumb", "electric", "roof", "carpent", "joiner", "locksmith", "landscap",
    "builder", "construction", "heating", "hvac", "plaster", "paint", "decorat",
    "tiler", "drain", "glazing", "window", "scaffold", "handyman", "bathroom",
    "kitchen", "garage door"
]
FOOD_TERMS = ["restaurant", "cafe", "takeaway", "pub", "bar", "bakery", "catering"]
BEAUTY_TERMS = ["salon", "hair", "barber", "beauty", "nail", "spa"]
FITNESS_TERMS = ["gym", "fitness", "personal trainer", "martial arts", "yoga"]

class SearchBody(BaseModel):
    service: str = ""
    ideal_customer: str = ""
    location: str = "United Kingdom"
    cursor: int = 0
    limit: int = 20


def _list(v):
    if v is None:
        return []
    if isinstance(v, list):
        return v
    return [v]


def _target_terms(ideal: str):
    t = (ideal or "").lower()
    if any(x in t for x in ["trade", "trades", "builder", "contractor", "construction"]):
        return TRADE_TERMS
    if any(x in t for x in ["restaurant", "cafe", "food", "hospitality", "takeaway", "pub"]):
        return FOOD_TERMS
    if any(x in t for x in ["salon", "beauty", "barber", "hair"]):
        return BEAUTY_TERMS
    if any(x in t for x in ["gym", "fitness", "trainer", "yoga"]):
        return FITNESS_TERMS
    # Broad local-business fallback.
    return TRADE_TERMS + FOOD_TERMS + BEAUTY_TERMS + FITNESS_TERMS


def _download_region(region_index: int):
    name, bbox = REGIONS[region_index % len(REGIONS)]
    key = (region_index % len(REGIONS),)
    hit = CACHE.get(key)
    if hit and time.time() - hit[0] < 1800:
        return name, hit[1]

    with tempfile.NamedTemporaryFile(suffix=".geojson", delete=False) as f:
        out = f.name
    try:
        bbox_s = ",".join(str(x) for x in bbox)
        cmd = ["overturemaps", "download", f"--bbox={bbox_s}", "-f", "geojson", "--type=place", "-o", out]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=50)
        with open(out, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        feats = data.get("features", []) if isinstance(data, dict) else []
        CACHE[key] = (time.time(), feats)
        return name, feats
    finally:
        try:
            os.remove(out)
        except OSError:
            pass


def _address(props):
    a = _list(props.get("addresses"))
    if not a or not isinstance(a[0], dict):
        return ""
    x = a[0]
    parts = [x.get("freeform"), x.get("locality"), x.get("region"), x.get("postcode")]
    return ", ".join(str(p) for p in parts if p)


def _name(props):
    n = props.get("names") or {}
    if isinstance(n, dict):
        return n.get("primary") or n.get("common") or "Business"
    return "Business"


def _filter(feats, region_name, body: SearchBody):
    terms = _target_terms(body.ideal_customer)
    web_service = any(x in (body.service or "").lower() for x in ["web", "website", "shopify", "wordpress", "ecommerce", "landing page"])
    out = []
    for f in feats:
        props = f.get("properties") or {}
        name = str(_name(props)).strip()
        if not name or name.lower() == "business":
            continue
        taxonomy = json.dumps(props.get("taxonomy") or {}, ensure_ascii=False).lower()
        basic = str(props.get("basic_category") or "").lower()
        hay = f"{name.lower()} {basic} {taxonomy}"
        matched = [x for x in terms if x in hay]
        if not matched:
            continue
        websites = [str(x) for x in _list(props.get("websites")) if x]
        socials = [str(x) for x in _list(props.get("socials")) if x]
        emails = [str(x) for x in _list(props.get("emails")) if x]
        phones = [str(x) for x in _list(props.get("phones")) if x]
        if web_service and websites:
            continue
        if not (phones or emails or socials):
            continue
        addr = _address(props)
        evidence = []
        score = 58
        if web_service and not websites:
            score += 22
            evidence.append("no website listed")
        if phones:
            score += 8
            evidence.append("phone listed")
        if emails:
            score += 7
            evidence.append("email listed")
        if socials:
            score += 5
            evidence.append("social account listed")
        score = min(score, 96)
        q = quote_plus(" ".join(x for x in [name, addr or region_name] if x))
        summary = f"{name} — {basic.replace('_',' ') or 'local business'} in {addr or region_name}. " + "; ".join(evidence) + "."
        out.append({
            "source": "Overture Places",
            "source_external_id": str(props.get("id") or f.get("id") or q),
            "display_name": name,
            "summary": summary,
            "source_url": f"https://www.google.com/search?q={q}",
            "kind": "prospect",
            "intent_score": 35,
            "fit_score": score,
            "competition": "low",
            "region": region_name,
            "category": basic,
            "phone": phones[0] if phones else None,
            "email": emails[0] if emails else None,
            "social": socials[0] if socials else None,
            "need_signal": "no_website_listed" if web_service and not websites else "target_match",
        })
    out.sort(key=lambda x: (-x["fit_score"], x["display_name"].lower()))
    return out[: max(1, min(body.limit, 40))]


@app.get("/health")
def health():
    return {"ok": True, "regions": len(REGIONS), "source": "Overture Places"}


@app.post("/search")
async def search(body: SearchBody, x_operator_key: str | None = Header(default=None)):
    if not SECRET or x_operator_key != SECRET:
        raise HTTPException(status_code=401, detail="unauthorized")
    region_index = body.cursor % len(REGIONS)
    try:
        region_name, feats = await asyncio.to_thread(_download_region, region_index)
        results = _filter(feats, region_name, body)
        # If one patch is sparse, automatically try the next patch too.
        if len(results) < 5:
            n2, f2 = await asyncio.to_thread(_download_region, (region_index + 1) % len(REGIONS))
            results += _filter(f2, n2, body)
            dedup = {}
            for x in results:
                dedup[x["source_external_id"]] = x
            results = sorted(dedup.values(), key=lambda x: -x["fit_score"])[: max(1, min(body.limit, 40))]
        return {"ok": True, "results": results, "regions_checked": 2 if len(results) < 5 else 1, "cursor_next": (region_index + 1) % len(REGIONS)}
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Overture query timed out")
    except subprocess.CalledProcessError as e:
        detail = (e.stderr or b"").decode("utf-8", "ignore")[-800:]
        raise HTTPException(status_code=502, detail=detail or "Overture query failed")
