import asyncio, json, os, time
from urllib.parse import quote_plus

import duckdb
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

app = FastAPI(title="OPERATOR Discovery", version="2.1")
SECRET = os.environ.get("OPERATOR_DISCOVERY_SECRET", "")
RELEASE = "2026-10-21.0"
PARQUET = f"s3://overturemaps-us-west-2/release/{RELEASE}/theme=places/type=place/*"
CACHE = {}

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
    "plumb", "electric", "roof", "carpent", "joiner", "landscap", "builder",
    "construction", "heating", "hvac", "plaster", "decorat", "tiler",
    "drain", "glazing", "window", "scaffold", "handyman", "bathroom", "kitchen"
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
    if v is None: return []
    if isinstance(v, list): return v
    if isinstance(v, tuple): return list(v)
    return [v]

def _flatten(v):
    out=[]
    for x in _list(v):
        if isinstance(x,str): out.append(x)
        elif isinstance(x,dict):
            for value in x.values():
                if isinstance(value,str): out.append(value)
    return [x for x in out if x]

def _target_type(ideal: str):
    t=(ideal or "").lower()
    if any(x in t for x in ["trade","trades","builder","contractor","construction","plumber","electrician","roofer"]): return "trades"
    if any(x in t for x in ["restaurant","cafe","food","hospitality","takeaway","pub"]): return "food"
    if any(x in t for x in ["salon","beauty","barber","hair"]): return "beauty"
    if any(x in t for x in ["gym","fitness","trainer","yoga"]): return "fitness"
    return "local"

def _target_terms(ideal: str):
    kind=_target_type(ideal)
    if kind=="trades": return TRADE_TERMS
    if kind=="food": return FOOD_TERMS
    if kind=="beauty": return BEAUTY_TERMS
    if kind=="fitness": return FITNESS_TERMS
    return TRADE_TERMS+FOOD_TERMS+BEAUTY_TERMS+FITNESS_TERMS

def _query_region(region_index:int):
    name,bbox=REGIONS[region_index%len(REGIONS)]
    key=region_index%len(REGIONS)
    hit=CACHE.get(key)
    if hit and time.time()-hit[0]<1800: return name,hit[1]
    west,south,east,north=bbox
    con=duckdb.connect(database=":memory:")
    try:
        con.execute("INSTALL httpfs")
        con.execute("LOAD httpfs")
        con.execute("SET s3_region='us-west-2'")
        con.execute("SET enable_object_cache=true")
        rows=con.execute(f"""
            SELECT id,names.primary AS name,basic_category,taxonomy,websites,socials,emails,phones,addresses
            FROM read_parquet('{PARQUET}', hive_partitioning=1)
            WHERE bbox.xmin BETWEEN ? AND ? AND bbox.ymin BETWEEN ? AND ?
            LIMIT 7000
        """,[west,east,south,north]).fetchall()
        cols=[d[0] for d in con.description]
        feats=[dict(zip(cols,row)) for row in rows]
        CACHE[key]=(time.time(),feats)
        return name,feats
    finally:
        con.close()

def _address(props):
    a=_list(props.get("addresses"))
    if not a or not isinstance(a[0],dict): return ""
    x=a[0]
    return ", ".join(str(p) for p in [x.get("freeform"),x.get("locality"),x.get("region"),x.get("postcode")] if p)

def _matches_target(name,basic,taxonomy,ideal):
    kind=_target_type(ideal)
    n=name.lower(); b=basic.lower(); t=taxonomy.lower(); hay=f"{n} {b} {t}"
    if kind=="trades":
        if b in {"home_service","building_or_construction_service"}: return True
        return any(x in n for x in TRADE_TERMS) or any(x in b for x in ["plumb","electric","roof","construction","contractor","carpent","joiner","landscap","heating"])
    if kind=="food": return any(x in f"{n} {b}" for x in FOOD_TERMS)
    if kind=="beauty": return any(x in f"{n} {b}" for x in BEAUTY_TERMS)
    if kind=="fitness": return any(x in f"{n} {b}" for x in FITNESS_TERMS)
    return any(x in hay for x in _target_terms(ideal))

def _filter(feats,region_name,body:SearchBody):
    web_service=any(x in (body.service or "").lower() for x in ["web","website","shopify","wordpress","ecommerce","landing page"])
    out=[]
    for props in feats:
        name=str(props.get("name") or "").strip()
        if not name: continue
        taxonomy=json.dumps(props.get("taxonomy") or {},ensure_ascii=False).lower()
        basic=str(props.get("basic_category") or "").lower()
        if not _matches_target(name,basic,taxonomy,body.ideal_customer): continue
        websites=_flatten(props.get("websites")); socials=_flatten(props.get("socials")); emails=_flatten(props.get("emails")); phones=_flatten(props.get("phones"))
        if web_service and websites: continue
        if not (phones or emails or socials): continue
        addr=_address(props); evidence=[]; score=58
        if web_service and not websites: score+=22; evidence.append("no website listed")
        if phones: score+=8; evidence.append("phone listed")
        if emails: score+=7; evidence.append("email listed")
        if socials: score+=5; evidence.append("social account listed")
        score=min(score,96)
        q=quote_plus(" ".join(x for x in [name,addr or region_name] if x))
        out.append({
            "source":"Overture Places","source_external_id":str(props.get("id") or q),"display_name":name,
            "summary":f"{name} — {basic.replace('_',' ') or 'local business'} in {addr or region_name}. "+"; ".join(evidence)+".",
            "source_url":f"https://www.google.com/search?q={q}","kind":"prospect","intent_score":35,"fit_score":score,
            "competition":"low","region":region_name,"category":basic,
            "need_signal":"no_website_listed" if web_service and not websites else "target_match"
        })
    out.sort(key=lambda x:(-x["fit_score"],x["display_name"].lower()))
    return out[:max(1,min(body.limit,40))]

@app.get("/health")
def health():
    return {"ok":True,"regions":len(REGIONS),"source":"Overture Places","release":RELEASE,"engine":"duckdb","version":"2.1"}

@app.post("/search")
async def search(body:SearchBody,x_operator_key:str|None=Header(default=None)):
    if not SECRET or x_operator_key!=SECRET: raise HTTPException(status_code=401,detail="unauthorized")
    region_index=body.cursor%len(REGIONS)
    try:
        region_name,feats=await asyncio.wait_for(asyncio.to_thread(_query_region,region_index),timeout=45)
        results=_filter(feats,region_name,body); checked=[region_name]
        if len(results)<5:
            n2,f2=await asyncio.wait_for(asyncio.to_thread(_query_region,(region_index+1)%len(REGIONS)),timeout=45)
            checked.append(n2); results+=_filter(f2,n2,body)
            dedup={x["source_external_id"]:x for x in results}
            results=sorted(dedup.values(),key=lambda x:-x["fit_score"])[:max(1,min(body.limit,40))]
        return {"ok":True,"results":results,"regions_checked":checked,"cursor_next":(region_index+len(checked))%len(REGIONS),"target_type":_target_type(body.ideal_customer)}
    except asyncio.TimeoutError: raise HTTPException(status_code=504,detail="Overture query timed out")
    except Exception as e: raise HTTPException(status_code=500,detail=str(e)[:500])
