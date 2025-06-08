import requests


def return_markdown(url: str) -> str:
    """Fetches the markdown content from a given URL using the Jina AI service."""
    res = requests.get("https://r.jina.ai/" + url)
    # soup = BeautifulSoup(res.content, "html.parser")
    # return soup.prettify()
    return res.text
