# Running locally

To use the tool for your own set of domains:
- Clone the repository
- Delete all files in `/data`
- Open `scrapers/scrape.js`
- Install [NodeJS](https://nodejs.org/en/download/current) and [Jekyll](https://jekyllrb.com/docs/)
- Delete the lines for all the domains (comments give instructions)
- Create an array called `domainsList` and enter domains in the format `domain,,agency name,,` ([example](#example-domain-list))
    - Domains can be any case
    - Domains shouldn't start with `http` or `www`
- Run `node scrapers/url`, then `node scrapers/metadata`, the `node scrapers/sitemap` 
    - It's important to run the URL scraper first
    - To only run on one domain, append the domain name to the end of the command (example: `node scrapers/url domain.gov`)
- Run `bundle exec jekyll serve` to start the website

## Example domain list

```javascript
const domainsList = [
    'domain1.gov,,Department of X,,'
    'domain2.gov,,Department of Y,,'
    'domain3.gov,,Department of Z,,'
];
```