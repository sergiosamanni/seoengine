from duckduckgo_search import DDGS
import json
with DDGS() as ddgs:
    res = list(ddgs.images("roma", max_results=2))
    print(json.dumps(res, indent=2))
