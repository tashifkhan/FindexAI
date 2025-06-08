from bs4 import BeautifulSoup
import html2text


def return_html_md(html: str) -> str:
    """Extension sends html body its converted to markdown text."""
    soup = BeautifulSoup(html, "html.parser")
    markdowntext = html2text.html2text(soup.body.prettify())
    return markdowntext
