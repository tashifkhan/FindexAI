from bs4 import BeautifulSoup
import html2text


def return_html_md(html: str) -> str:
    """Extension sends html body its converted to markdown text."""
    soup = BeautifulSoup(html, "html.parser")
    markdowntext = html2text.html2text(soup.body.prettify())
    return markdowntext


if __name__ == "__main__":
    import requests

    url = "https://portfolio.tashif.codes"

    # bs4
    res = requests.get(url)
    html = res.text
    soup = BeautifulSoup(html, "html.parser")
    markdown = return_html_md(str(soup))
    print(markdown)

    # jinja ai
    from request_md import return_markdown

    __markdown = return_markdown(url)
    print(__markdown)

    # conparision
    print("\n\nMarkdown length:", len(markdown))
    print("Jina AI Markdown length:", len(__markdown))
    print("Markdown is equal to Jina AI Markdown:", markdown == __markdown)
