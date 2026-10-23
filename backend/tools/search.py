import httpx
import urllib.parse
from typing import List, Dict

DUCKDUCKGO_URL = "https://html.duckduckgo.com/html/"

async def search_duckduckgo(query: str, max_results: int = 10) -> List[Dict[str, str]]:
    """Perform a DuckDuckGo HTML search and return a list of result dicts.
    Each dict contains 'title', 'url', and 'snippet'.
    No API key needed.
    """
    params = {"q": query}
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(DUCKDUCKGO_URL, params=params)
        response.raise_for_status()
        html = response.text
    # Simple parsing – look for result blocks
    # DuckDuckGo HTML results have class "result" with a link and a snippet
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "html.parser")
    results = []
    for div in soup.select("div.result")[:max_results]:
        a = div.find("a", class_="result__a")
        if not a:
            continue
        title = a.get_text(strip=True)
        url = a.get("href")
        # DuckDuckGo links are redirect URLs; extract the real URL
        if url and url.startswith("/l/?uddg="):
            url = urllib.parse.unquote(url.split("/l/?uddg=")[1])
        snippet_tag = div.find("a", class_="result__snippet") or div.find("div", class_="result__snippet")
        snippet = snippet_tag.get_text(strip=True) if snippet_tag else ""
        results.append({"title": title, "url": url, "snippet": snippet})
    return results
