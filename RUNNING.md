# Running locally

Contents:

- [Quickstart](#quickstart)
- [Running with the website](#running-with-the-website)
- [Running without the website](#running-without-the-website)
- [Customization](#customization)

## Quickstart

To use the tool for your own set of domains:
- Clone the repository
- Install [NodeJS](https://nodejs.org/en/download/current)
- Run `npm install`
- Delete all files in `/data` and `CNAME`
- Update the `User-Agent` [header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/User-Agent) in the `options` object in `scrapers/scrape.js`
- (Optional) [Use custom domains](#custom-domains) or [disable www validation](#removing-www-validation)
- Run `node scrapers/url`, then `node scrapers/metadata`, then `node scrapers/robots`, then `node scrapers/sitemap` 
    - It's important to run the scrapers in that order
    - To only run one domain from the list, append the domain name to the end of the command (example: `node scrapers/url domain.gov`)
        - Make sure to run the scraper with all domains first
- Run [with](#running-with-the-website) or [without](#running-without-the-website) the website

## Running with the website 
- Install [Jekyll](https://jekyllrb.com/docs/)
- Run `bundle exec jekyll serve` to start the website or [only use the data](#running-without-the-website)
- The URL of the local site will be printed
- (Optional) [Publish to GitHub](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll)

## Running without the website

If you don't want to have a graphical version and only want to use the data (located in `/data`), delete:
- Any folder starting with `_`
- `/assets`
- `/blog`
- `/css`
- `/scripts`
- `_config.yml`
- `Gemfile` and `Gemfile.lock`
- `/.jekyll-cache` if it exists

## Customization

- [Domain list](#custom-domains)
- [Metadata parameters](#addingremoving-metadata-parameters)
- [www validation](#removing-www-validation)

### Custom domains

To use your own list of domains:
- Open `scrapers/scrape.js`
- Delete the lines for all the domains (comments give instructions)
- Create an array called `domainsList` and enter domains in the format `domain,,agency name` ([example](#example-domains-list))
    - Domains can be any case
    - Domains shouldn't start with `http` or `www`

<a id="example-domains-list">Example list:</a>
```javascript
const domainsList = [
    'domain1.gov,,Department of X'
    'domain2.gov,,Department of Y'
    'domain3.gov,,Department of Z'
];
```

### Adding/removing metadata parameters

To add/remove parameters from the data:
- Open `scrapers/metadata.js`
- Edit the `properties`, `variables`, and `csvVariables` arrays
    - Make sure each index lines up (first element in `properties` matches first element in `variables`)

To add/remove parameters to the site:
- Make sure the parameter is in the data
- Open `scripts/variables.js`
- Add an item in the `properties`, `names`, `variables`, and `descriptions` arrays
    - Make sure the name in `variables` matches the one in the data
    - Make sure each index lines up

### Removing www validation

If you don't want to check for [www canonicalization](https://gov-metadata.civichackingagency.org/docs/canonicalization):
- Open `scrapers/url.js`
- Change `CHECK_WWW` to `false`
- Open `scripts/util.js`
- Change `CHECK_WWW` to `false`