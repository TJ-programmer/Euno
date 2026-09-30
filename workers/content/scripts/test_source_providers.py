
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

import requests
import trafilatura


# ------------------------------------------------------------------
# PROJECT ROOT
# ------------------------------------------------------------------

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[1]),
)


# ------------------------------------------------------------------
# CONFIG
# ------------------------------------------------------------------

NEWS_API_URL = "https://newsapi.org/v2/everything"

DEFAULT_TOPIC = "why do we dream"

RESULT_LIMIT = 5

MIN_ARTICLE_LENGTH = 1000

REQUEST_TIMEOUT = 20


# ------------------------------------------------------------------
# HTTP HEADERS
# ------------------------------------------------------------------

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 "
        "(Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 "
        "(KHTML, like Gecko) "
        "Chrome/154.0 Safari/537.36"
    )
}


# ------------------------------------------------------------------
# NEWSAPI DISCOVERY
# ------------------------------------------------------------------

def search_newsapi(
    topic: str,
    *,
    limit: int = RESULT_LIMIT,
) -> list[dict]:

    api_key = os.getenv("NEWS_API_KEY")

    if not api_key:
        raise RuntimeError(
            "NEWS_API_KEY is not configured.\n\n"
            "PowerShell:\n"
            '$env:NEWS_API_KEY="your_api_key"\n'
        )

    params = {
        "q": topic,
        "language": "en",
        "sortBy": "relevancy",
        "pageSize": limit,
        "apiKey": api_key,
    }

    response = requests.get(
        NEWS_API_URL,
        params=params,
        timeout=REQUEST_TIMEOUT,
    )

    response.raise_for_status()

    data = response.json()

    if data.get("status") != "ok":
        raise RuntimeError(
            f"NewsAPI returned an error: {data}"
        )

    return data.get("articles", [])


# ------------------------------------------------------------------
# ARTICLE FETCH
# ------------------------------------------------------------------

def fetch_article(
    url: str,
) -> tuple[int, str]:

    try:
        response = requests.get(
            url,
            headers=HEADERS,
            timeout=REQUEST_TIMEOUT,
        )

        return (
            response.status_code,
            response.text,
        )

    except requests.RequestException as exc:
        print(
            f"FETCH ERROR: {exc}"
        )

        return (
            0,
            "",
        )


# ------------------------------------------------------------------
# ARTICLE EXTRACTION
# ------------------------------------------------------------------

def extract_article(
    html: str,
) -> dict:

    if not html:
        return {
            "text": "",
            "title": None,
            "author": None,
            "date": None,
        }

    extracted = trafilatura.extract(
        html,
        output_format="json",
        include_comments=False,
        include_tables=False,
        include_links=False,
        favor_precision=True,
    )

    if not extracted:
        return {
            "text": "",
            "title": None,
            "author": None,
            "date": None,
        }

    import json

    try:
        data = json.loads(extracted)
    except json.JSONDecodeError:
        return {
            "text": extracted,
            "title": None,
            "author": None,
            "date": None,
        }

    return {
        "text": data.get("text") or "",
        "title": data.get("title"),
        "author": data.get("author"),
        "date": data.get("date"),
    }


# ------------------------------------------------------------------
# TEXT CLEANUP
# ------------------------------------------------------------------

def clean_text(
    text: str,
) -> str:

    if not text:
        return ""

    text = re.sub(
        r"\s+",
        " ",
        text,
    )

    return text.strip()


# ------------------------------------------------------------------
# ARTICLE QUALITY
# ------------------------------------------------------------------

def evaluate_article(
    *,
    extracted_text: str,
    http_status: int,
) -> tuple[str, list[str]]:

    reasons = []

    if http_status != 200:
        reasons.append(
            f"HTTP status {http_status}"
        )

    if not extracted_text:
        reasons.append(
            "article extraction returned no text"
        )

    if len(extracted_text) < MIN_ARTICLE_LENGTH:
        reasons.append(
            f"article text below minimum "
            f"({MIN_ARTICLE_LENGTH} chars)"
        )

    if reasons:
        return (
            "REJECT",
            reasons,
        )

    return (
        "PASS",
        [],
    )


# ------------------------------------------------------------------
# SOURCE REPORT
# ------------------------------------------------------------------

def print_article_report(
    index: int,
    article: dict,
) -> None:

    title = (
        article.get("title")
        or "Unknown"
    )

    source = (
        article.get("source", {})
        .get("name")
        or "Unknown"
    )

    url = article.get("url")

    published_at = article.get(
        "publishedAt"
    )

    description = (
        article.get("description")
        or ""
    )

    print()
    print(
        "-" * 70
    )

    print(
        f"[{index}] {title}"
    )

    print(
        f"Source:     {source}"
    )

    print(
        f"Published:  {published_at}"
    )

    print(
        f"Domain:     "
        f"{urlparse(url).netloc if url else 'Unknown'}"
    )

    print(
        f"URL:        {url}"
    )

    print(
        f"Description characters: "
        f"{len(description)}"
    )

    # --------------------------------------------------------------
    # URL CHECK
    # --------------------------------------------------------------

    if not url:
        print()
        print(
            "EXTRACTION"
        )
        print(
            "--------"
        )
        print(
            "status: REJECT"
        )
        print(
            "reason: missing article URL"
        )
        return

    # --------------------------------------------------------------
    # FETCH
    # --------------------------------------------------------------

    status_code, html = fetch_article(
        url
    )

    print()
    print(
        "FETCH"
    )
    print(
        "-----"
    )

    print(
        f"HTTP status: {status_code}"
    )

    if not html:
        print(
            "HTML received: NO"
        )

        print()
        print(
            "EXTRACTION"
        )
        print(
            "----------"
        )
        print(
            "status: REJECT"
        )
        print(
            "reason: no HTML returned"
        )

        return

    print(
        "HTML received: YES"
    )

    # --------------------------------------------------------------
    # TRAFILATURA EXTRACTION
    # --------------------------------------------------------------

    extracted = extract_article(
        html
    )

    article_text = clean_text(
        extracted["text"]
    )

    article_title = (
        extracted["title"]
        or title
    )

    author = (
        extracted["author"]
        or "Unknown"
    )

    extracted_date = (
        extracted["date"]
        or published_at
        or "Unknown"
    )

    # --------------------------------------------------------------
    # QUALITY
    # --------------------------------------------------------------

    quality, reasons = evaluate_article(
        extracted_text=article_text,
        http_status=status_code,
    )

    print()
    print(
        "EXTRACTION"
    )
    print(
        "----------"
    )

    print(
        f"status: {quality}"
    )

    print(
        f"title: {article_title}"
    )

    print(
        f"author: {author}"
    )

    print(
        f"date: {extracted_date}"
    )

    print(
        f"characters: {len(article_text):,}"
    )

    print()
    print(
        "QUALITY"
    )
    print(
        "-------"
    )

    if quality == "PASS":
        print(
            "article text: PASS"
        )
        print(
            f"minimum length: PASS "
            f"({len(article_text):,} >= "
            f"{MIN_ARTICLE_LENGTH:,})"
        )
    else:
        print(
            "article text: FAIL"
        )

        for reason in reasons:
            print(
                f"- {reason}"
            )

    # --------------------------------------------------------------
    # PREVIEW
    # --------------------------------------------------------------

    if article_text:
        preview_length = 500

        preview = article_text[
            :preview_length
        ]

        if len(article_text) > preview_length:
            preview += "..."

        print()
        print(
            "ARTICLE PREVIEW"
        )
        print(
            "---------------"
        )

        print(
            preview
        )


# ------------------------------------------------------------------
# MAIN
# ------------------------------------------------------------------

def main() -> None:

    topic = (
        sys.argv[1]
        if len(sys.argv) > 1
        else DEFAULT_TOPIC
    )

    print()
    print(
        "=" * 70
    )
    print(
        "EUNO SOURCE PROVIDER TEST"
    )
    print(
        "=" * 70
    )

    print(
        f"Topic: {topic}"
    )

    # --------------------------------------------------------------
    # NEWSAPI
    # --------------------------------------------------------------

    print()
    print(
        "=" * 70
    )
    print(
        "NEWSAPI DISCOVERY"
    )
    print(
        "=" * 70
    )

    articles = search_newsapi(
        topic,
        limit=RESULT_LIMIT,
    )

    print(
        f"Candidates found: {len(articles)}"
    )

    if not articles:
        print(
            "No candidates found."
        )
        return

    # --------------------------------------------------------------
    # FETCH + EXTRACTION
    # --------------------------------------------------------------

    print()
    print(
        "=" * 70
    )
    print(
        "ARTICLE EXTRACTION TEST"
    )
    print(
        "=" * 70
    )

    for index, article in enumerate(
        articles,
        start=1,
    ):
        print_article_report(
            index,
            article,
        )

    # --------------------------------------------------------------
    # COMPLETE
    # --------------------------------------------------------------

    print()
    print(
        "=" * 70
    )
    print(
        "SOURCE PROVIDER TEST COMPLETE"
    )
    print(
        "=" * 70
    )


if __name__ == "__main__":
    main()

