from bs4 import BeautifulSoup
import html2text


def return_html_md(html: str) -> str:
    """Extension sends html body its converted to markdown text."""
    soup = BeautifulSoup(html, "html.parser")
    markdowntext = html2text.html2text(soup.body.prettify())
    return markdowntext


if __name__ == "__main__":
    import requests

    res = requests.get("https://portfolio.tashif.codes")
    html = res.text
    soup = BeautifulSoup(html, "html.parser")
    markdown = return_html_md(str(soup))
    print(markdown)
