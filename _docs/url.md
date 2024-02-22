---
title: "URL"
date: 2024-02-21
description: "Government website address configuration."
keywords: url, https, canonicalization, .gov
---

Uniform Resource Locator (URL) is the technical term for a website address (ex: `https://example.gov`).

Properly configured government URLs include:

* `https` protocol
* `www` and non-`www` canonicalization
* `.gov` / `.edu` / `.mil` extension

## HTTPS

Hypertext Transfer Protocol Secure (HTTPS) is the strongest privacy and integrity protection currently available for public web connections. This is indicated by a lock icon and/or `https://` in the browser bar. HTTPS ensures users that their privacy is protected when visiting a government website.

All government domains must use HTTPS.

* [The HTTPS-Only Standard ](https://https.cio.gov/) (CIO.gov)

## www / non-www

Domain canonicalization allows access to the intended website address, whether users type `www` (`www.example.gov`) or not (`example.gov`). Improper canonicalization will fail to direct `example.gov` to the intended address, and users will receive an error.

All government domains must have proper canonicalization (`www` and non-`www`).

## .gov / .edu / .mil

Generic top-level domains (gTLD) (`.com`, `.org`, etc.) are non-country extensions that indicate the purpose or source of the website. Sponsored top-level domains (sTLD) (`.gov` / `.edu` / `.mil`) are a subgroup of gTLDs managed by designated organizations and restricted to specific registrant types.

A `.gov` / `.edu` / `.mil` extension verifies that the website is managed by a United States government organization (federal, state, local). Government non-.gov gTLDs can potentially confuse users and create opportunities for non-government entities to spoof official government services. Adopting the `.gov` / `.edu` / `.mil` extension ensures users are visiting an official government website.

All U.S. government websites must have an sTLD.

* [Get a .gov](https://get.gov/) (Cybersecurity and Infrastructure Security Agency)