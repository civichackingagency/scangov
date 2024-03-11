---
title: "Sitemap"
date: 2024-03-05
description: "Directory of website pages."
keywords: sitemap, grades, scores
---

## Guidance

All government websites must have a sitemap.

## About

A sitemap is a file that lists all of the pages on a website in addition to information about each so that search engines can more intelligently crawl the site.

Web crawlers usually discover pages from links within the site and from other sites. Sitemaps supplement this data to allow crawlers that support sitemaps to pick up all Uniform Resources Locators (URLs) in the sitemap and learn about them using the associated metadata. Using sitemap protocol doesn’t guarantee web pages are included in search engines, but provides hints for web crawlers to do a better job of crawling your site.

The sitemap is an Extensible Markup Language (XML) file on the website’s root directory that include metadata for each URL, such as:

* when it was last updated
* how often it usually changes
* how important it is, relative to other URLs in the site

## Examples

* [https://www.usa.gov/sitemap.xml](https://www.usa.gov/sitemap.xml)
* [https://digital.gov/sitemap.xml](https://digital.gov/sitemap.xml)

## Code

Example sitemap code:

```html
<?xml version="1.0" encoding="UTF-8"?>

<urlset xmlns="[http://www.sitemaps.org/schemas/sitemap/0.9](http://www.sitemaps.org/schemas/sitemap/0.9)">

   <url>

      <loc>http://www.example.com/</loc>

      <lastmod>2005-01-01</lastmod>

      <changefreq>monthly</changefreq>

      <priority>0.8</priority>

   </url>

</urlset>
```

## Links

* [sitemaps.org](https://www.sitemaps.org/)
* [Sitemaps](https://en.wikipedia.org/wiki/Sitemaps) (Wikipedia)