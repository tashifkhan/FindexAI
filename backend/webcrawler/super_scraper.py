from langchain_community.document_loaders import WebBaseLoader
import bs4
import asyncio


async def clean_response(url: str) -> str:
    """Fetches the content of a webpage and returns its cleaned text."""

    page_url = url if url.startswith("http") else "https://" + url
    loader = WebBaseLoader(
        web_paths=[
            page_url,
        ],
        bs_kwargs={
            "parse_only": bs4.SoupStrainer(class_="theme-doc-markdown markdown"),
        },
        bs_get_text_kwargs={
            "separator": " | ",
            "strip": True,
        },
    )

    docs = []
    async for doc in loader.alazy_load():
        docs.append(doc)

    assert len(docs) == 1
    doc = docs[0]
    return doc


if __name__ == "__main__":

    url = "portfolio.tashif.codes"
    cleaned_text = asyncio.run(clean_response(url))
    print(cleaned_text)

    doc = cleaned_text
    print(f"{doc.metadata}\n")
    print(doc.page_content[:500])
