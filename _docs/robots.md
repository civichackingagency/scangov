---
title: "Robots"
date: 2024-03-05
description: "Instructions about the site to web robots."
keywords: robots, grades, scores
---

## Guidance

All government websites must allow robots indexing and following.

## About

Web robots, also known as web wanderers, crawlers or spiders, are automated programs that traverse the Web. Search engines use them to index web content, while spammers use them to scan for email addresses, among other purposes.

A robots.txt file is a text file placed on a website's server to instruct web robots (typically search engine crawlers) how to crawl and index pages on their site. It specifies which parts of the site should not be accessed by crawlers or are "off-limits" to them. It's a way for website owners to communicate with web robots and guide their behavior.

A robots policy can be used to limit the rate of requests or to block robots from indexing paths, which can save stress on the server. The file consists of one or more records separated by one or more blank lines. The record starts with one or more `User-agent` lines, followed by one or more `Disallow` lines. Unrecognised headers are ignored.

User-agent:
- The value of this field is the name of the robot the record is describing access policy for.
- If the value is `*`, the record describes the default access policy for any robot that has not matched any of the other records. It is not allowed to have multiple such records in the `/robots.txt` file.

Disallow:
- The value of this field specifies a partial URL that is not to be visited. This can be a full path, or a partial path; any URL that starts with this value will not be retrieved. For example, `Disallow: /help` disallows both `/help.html` and `/help/index.html`, whereas `Disallow: /help/` would disallow `/help/index.html` but allow `/help.html`.
- Any empty value, indicates that all URLs can be retrieved. At least one Disallow field needs to be present in a record.

The presence of an empty `/robots.txt` file has no explicit associated semantics, it will be treated as if it was not present, i.e. all robots will consider themselves welcome.

### Other methods

A robots policy can be set through the `<meta name="robots">` tag.

It can also be set using the `X-Robots-Tag` HTTP response header.

## Examples

Example government website robots.txt files:

* [https://www.usa.gov/robots.txt](https://www.usa.gov/robots.txt)
* [https://18f.gsa.gov/robots.txt](https://18f.gsa.gov/robots.txt)

## Code

Example robots.txt code:

```yaml
# Only applies to search.gov scraping
User-agent: usasearch  
# Slow amount of requests
Crawl-delay: 2
# Specify it can read /archive/
Allow: /archive/

# Applies to all scrapers
User-agent: *
# Slow amount of requests to 1 every 10 seconds
Crawl-delay: 10
# Don't let them read /archive/
Disallow: /archive/
```

Example robots meta code:
```html
<!-- This page can be indexed 
and links on it can be followed -->
<meta name="robots" content="index, follow">
```

Example X-Robots-Tag:
```yaml
# This URL can be indexed 
# and links on it can be followed
X-Robots-Tag: index, follow
```

## Links

- [robotstxt.org](https://www.robotstxt.org)
- [robots.txt](https://search.gov/indexing/robotstxt.html) (Search.gov)
- [robots.txt](https://en.wikipedia.org/wiki/Robots.txt) (Wikipedia)
- [Meta tag and HTTP response](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag) (Google)