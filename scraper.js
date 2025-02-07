import http from 'http';
import https from 'https';
import zlib from 'zlib';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import readlineSync from 'readline-sync';
import { exit } from 'process';

let debug = false;
for (let i = 2; i < process.argv.length; i++)
if (process.argv[i] === '--debug') {
    debug = true;
    break;
}

const timeout = 10000;
const headers = {
    'User-Agent': 'CivicHackingAgency/2.0 ScanGov',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*\/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
}
const zlibOptions = { finishFlush: zlib.constants.Z_SYNC_FLUSH };

// Variables for metadata
// Tags to search for
const metaTags = [
    '<title',
    'name="description"',
    'name="keywords"',
    'name="robots"',
    'http-equiv="content-security-policy"',
    'name="viewport"',
    'rel="canonical"',
    'property="og:locale"',
    'property="og:site_name"',
    'property="og:type"',
    'property="og:title"',
    'property="og:description"',
    'property="og:url"',
    'property="og:image"',
    'property="og:image:width"',
    'property="og:image:height"',
    'property="og:image:alt"',
    'name="twitter:site"',
    'name="twitter:card"',
    'name="twitter:title"',
    'name="twitter:description"',
    'name="twitter:image"'
]
// Regular expressions for tags
.map(property => { return { rel: property.includes('rel'), regex: new RegExp(property.replaceAll('"', '("|)'), 'm') } });
// Their names in the code
const metaVariables = [
    'title',
    'description',
    'keywords',
    'robots',
    'contentSecurityPolicy',
    'viewport',
    'canonical',
    'ogLocale',
    'ogSiteName',
    'ogType',
    'ogTitle',
    'ogDescription',
    'ogUrl',
    'ogImage',
    'ogImageWidth',
    'ogImageHeight',
    'ogImageAlt',
    'twitterSite',
    'twitterCard',
    'twitterTitle',
    'twitterDescription',
    'twitterImage'
];
const metaCsvVariables = [
    'title',
    'description',
    'keywords',
    'robots',
    'content_security_policy',
    'viewport',
    'canonical',
    'og_locale',
    'og_site_name',
    'og_type',
    'og_title',
    'og_description',
    'og_url',
    'og_image',
    'og_image_width',
    'og_image_height',
    'og_image_alt',
    'twitter_site',
    'twitter_card',
    'twitter_title',
    'twitter_description',
    'twitter_image'
];

// Send the completed request data
const finishRequest = (resolve, res, data, url, error=null) => {
    res.headers['content-type'] = res.headers['content-type'] || 'undefined';
    resolve({ req: res.req, statusCode: res.statusCode, headers: res.headers, data, url: url.href, error });
};

// Check if a URL is valid
// Return false if not, return the URL if it is
const isValidUrl = (url, base) => {
    try {
        return url !== undefined && new URL(url, base).href;
    }
    catch {
        return false;
    }
};

const fetch = (url, httpAgent, httpsAgent, visited, followRedirects=true, method='GET', referrer='') => 
    new Promise(async (resolve, reject) => {
        if (typeof url === 'string')
            url = new URL(url);
        let res, req;
        if (debug)
            console.log('fetch to', url.href);

        if (visited.has(url.href)) {
            if (debug)
                console.log('Using cached version of', url.href);
            req = url;
            res = visited.get(url.href);
        }
        else {
            // Use the correct protocol
            await new Promise((resolveRequest, rejectRequest) => {
                try {
                    if (debug)
                        console.log('Request to', url.href);
                    req = 
                        (url.protocol === 'https:' ? https : http).request(url, { method, agent: url.protocol === 'https:' ? httpsAgent : httpAgent, headers, timeout }, response => {
                            // Remove timeout handler
                            req.socket.off('timeout', req.abort);

                            res = response;
                            visited.set(url.href, res);

                            resolveRequest();
                        })
                        .on('socket', s => {
                            s.setTimeout(timeout);
                            s.on('timeout', req.abort);
                        })
                        .on('error', e => { 
                            console.error(e.code, e.syscall, url.href);
                            resolve({ req, statusCode: 500, data: null, url: url.href }); 
                        })
                        .end();
                }
                catch (e) {
                    console.log(url)
                    console.error(e, url.href);
                    resolve({ req, statusCode: 500, data: null, url: url.href });
                }
            });
        }

        if (debug)
            console.log(url.href, res.statusCode);

        // Handle non-OK responses
        if (res.statusCode >= 300) {
            // Consume response to free the socket
            res.resume();
            // Redirection
            const valid = isValidUrl(res.headers.location, req.protocol + '//' + req.host);
            if (followRedirects && res.statusCode < 400 && valid && valid !== url.href && valid !== referrer) {
                if (debug)
                    console.log('Header redirect from', url.href, 'to', valid);
                fetch(valid, httpAgent, httpsAgent, visited, followRedirects, method, url.href).then(resolve);
            }
            // The response is an error
            else
            finishRequest(resolve, res, null, url);
            return;
        }

        let data;
        // Check for meta redirect and finish request
        const metaRedirect = () => { 
            let html;
            // Get the http-equiv redirect
            // https://www.w3.org/TR/WCAG20-TECHS/H76.html#H76-description
            if (followRedirects && res.headers['content-type'] && res.headers['content-type'].startsWith('text/html') && (html = data.toLowerCase()).includes('http-equiv="refresh"')) {
                let index = html.indexOf('http-equiv="refresh"');
                index = html.indexOf('url=', index) + 4;
                let redirectUrl = html.substring(index);
                // Get URL between single or double quotes
                if (redirectUrl.startsWith('"') || redirectUrl.startsWith('\''))
                    redirectUrl = redirectUrl.substring(1);
                const doubleIndex = redirectUrl.indexOf('"'), singleIndex = redirectUrl.indexOf('\'');
                if (doubleIndex !== -1) {
                    if (singleIndex !== -1)
                        redirectUrl = redirectUrl.substring(0, Math.min(singleIndex, doubleIndex));
                        else
                        redirectUrl = redirectUrl.substring(0, doubleIndex);
                }
                else
                redirectUrl = redirectUrl.substring(0, singleIndex);

                // Continue requests 
                const valid = isValidUrl(redirectUrl, req.protocol + '//' + req.host);
                if (valid && valid !== url.href && valid !== referrer) {
                    if (debug)
                        console.log('Meta redirect from', url.href, 'to', valid);
                    fetch(valid, httpAgent, httpsAgent, visited, followRedirects, method, url.href).then(resolve);
                }
                else 
                finishRequest(resolve, res, data, url);
            }
            else
            finishRequest(resolve, res, data, url);
        }

        if (res.data) {
            // Use stored version of request
            data = res.data;
            metaRedirect();
        }
        else {
            // Receive and decompress data
            const contentLength = parseInt(res.headers['content-length']);
            data = Buffer.alloc(contentLength || 0);
            let index = 0;
            const encoding = res.headers['content-encoding'] || 'utf8';
            let stream;
            // Choose right decompression algorithm
            switch (encoding) {
                case 'gzip':
                    stream = zlib.createGunzip(zlibOptions);
                    res.pipe(stream);
                    break;
                case 'deflate':
                    stream = zlib.createInflate(zlibOptions);
                    res.pipe(stream);
                    break;
                case 'br':
                    stream = zlib.createBrotliDecompress(zlibOptions);
                    res.pipe(stream);
                    break;
                default:
                    stream = res;
                    break;
            }
            stream.on('data', chunk => data = Buffer.concat([ data, chunk ]));
            stream.on('error', e => { console.error(encoding + ' decompression error at ' + url, e); resolve({ req, statusCode: 500, data: null, url: url.href }); });
            stream.on('end', () => {
                data = data.toString();
                res.data = data;
                visited.set(url.href, res);
                metaRedirect();
            });
            // TODO: debug socket and TCP events
        }
    });


const urlResults = [], metadataResults = [], robotsResults = [], sitemapResults = [], securityResults = [];
const urlHistory = existsSync('public/data/url.json') ? JSON.parse(readFileSync('public/data/url.json')) : [],
sitemapHistory = existsSync('public/data/sitemap.json') ? JSON.parse(readFileSync('public/data/sitemap.json')) : [],
robotsHistory = existsSync('public/data/robots.json') ? JSON.parse(readFileSync('public/data/robots.json')) : [],
metadataHistory = existsSync('public/data/metadata.json') ? JSON.parse(readFileSync('public/data/metadata.json')) : [],
securityHistory = existsSync('public/data/security.json') ? JSON.parse(readFileSync('public/data/security.json')) : [];

const domainsCsv = readFileSync('public/data/domains.csv', 'utf8');
let domains = domainsCsv.split('\n').slice(1).filter(d => d.includes(','));
// domains = domains.slice(0, 50);
domains = domains.reverse();
// If a single domain is specified, make the queue only that domain
let found = false;
if (process.argv[2]) {
    for (const domain of domains)
    if (domain.startsWith(process.argv[2])) {
        domains = [ domain ];
        found = true;
    }
    else {
        metadataResults.push(metadataHistory.find(d => domain.startsWith(d.url)));
        urlResults.push(urlHistory.find(d => domain.startsWith(d.url)));
        sitemapResults.push(sitemapHistory.find(d => domain.startsWith(d.url)));
        robotsResults.push(robotsHistory.find(d => domain.startsWith(d.url)));
        securityResults.push(securityHistory.find(d => domain.startsWith(d.url)));
    }

    if (!found && !process.argv[2].startsWith('--')) {
        console.log('Domain ' + process.argv[2] + ' not found, adding it to list');    
        console.log('To cancel, press Ctrl+C');
        let org = readlineSync.question('Enter organization name: ').trim();
        if (org.includes(','))
            org = '"' + org + '"';
        const domain = process.argv[2] + ',' + org;
        domains = [ domain ];
        writeFileSync('public/data/domains.csv', domainsCsv + '\n' + domain);
    }
}

let done = 0, startTime = Date.now();
const scrapers = [];
for (let i = 0; i < 3 && i < domains.length; i++)
scrapers.push(new Promise(async (resolve, reject) => {
    // Agents allow for keeping the connection alive
    // This means the request doesn't have to do a DNS lookup and TLS handshake every time and only has to do it once
    const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 1}), 
    httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 1});

    while (domains.length > 0) {
        let domain = domains.shift();
        const name = domain.substring(domain.indexOf(',') + 1).replaceAll('"', '');
        domain = domain.substring(0, domain.indexOf(','));

        if (debug)
            console.log(i, 'Starting', domain);

        const visited = new Map();

        let expireTime = 0, protocol = 'http://';
        let maxAge, hstsStatus;
        for (let i = 0; i < securityHistory.length; i++)
        if (securityHistory[i].url === domain) {
            expireTime = securityHistory[i].expireTime;
            maxAge = securityHistory[i].maxAge;
            hstsStatus = securityHistory[i].status;
            break;
        }

        let hstsReq, hsts;
        if (startTime > expireTime || !(maxAge > 0)) {
            if (debug)
                console.log('Checking HSTS');

            hstsReq = fetch('https://' + domain , httpAgent, httpsAgent, visited, false);
            hsts = await hstsReq;
            if (hsts.statusCode < 300 || hsts.statusCode < 400 && hsts.headers.location && hsts.headers.location.startsWith('https://'))
                protocol = 'https://';

            const sts = hsts.headers && hsts.headers['strict-transport-security'];
            if (sts) {
                maxAge = sts.substring(sts.indexOf('=') + 1);
                const semiColonIndex = maxAge.indexOf(';');
                if (semiColonIndex !== -1)
                    maxAge = maxAge.substring(0, semiColonIndex);
                maxAge = parseInt(maxAge);
            }
        }
        else if (expireTime > 0)
            protocol = 'https://';

        const hstsValid = maxAge > 0;
        const security = {
            url: domain,
            name,
            status: hstsStatus || (hsts && hsts.statusCode),
            hsts: hstsValid,
            maxAge: hstsValid ? maxAge : -1,
            expireTime: hstsValid ? (startTime + maxAge) : -1
        };

        // URL
        const baseLocation = (hsts && hsts.statusCode < 400 && hsts.headers.location) ? isValidUrl(hsts.headers.location, protocol + domain) : protocol + domain;
        let base = (hsts && (hsts.statusCode < 300 || hsts.statusCode > 400)) ? hstsReq : 
            fetch(baseLocation, httpAgent, httpsAgent, visited);
        let www = fetch(protocol + 'www.' + domain, httpAgent, httpsAgent, visited);
        const responses = await Promise.all([base, www]);
        base = responses[0], www = responses[1];
        // The response used to score HTTPS and TLD
        const res = base.statusCode < 300 ? base : www;

        const validWww = !!(base.req && www.req) && base.statusCode < 300 && www.statusCode < 300 && base.req.protocol === www.req.protocol && base.req.host === www.req.host && base.req.pathname === www.req.pathname;
        const useWww = www.statusCode < 300 && (validWww || base.statusCode >= 300) && res.req.host.startsWith('www');

        security.csp = !!(res.headers && res.headers['content-security-policy']) && res.headers['content-security-policy'].length > 0;
        security.xContentTypeOptions = !!res.headers && res.headers['content-type'].startsWith('text/html') && res.headers['x-content-type-options'] === 'nosniff';

        const urlOutcome = { url: domain, name, status: res.statusCode, redirect: res.url, https: !!res.req && res.req.protocol === 'https:', 
            www: validWww,
            dotgov: !!res.req && !!res.req.host && (res.req.host.endsWith('.gov') || res.req.host.endsWith('.edu') || res.req.host.endsWith('.mil')) };
        urlResults.push(urlOutcome);

        let sitemapOutcome;

        let metadataOutcome = { status: res.statusCode, url: domain, name, redirect: res.url }, robotsOutcome = {};
        if (res.statusCode < 300) {
            // Metadata
            const html = res.data.replaceAll('\'', '"').toLowerCase();

            // Check for <title>
            let index = html.match(metaTags[0].regex);
            metadataOutcome.title = !!index && /* Make sure title isn't blank */ html.charAt(html.indexOf('>', index.index) + 1) !== '<';

            // Other tags
            for (let i = 1; i < metaTags.length; i++) {
                index = html.match(metaTags[i].regex);
                if (!index) {
                    // The tag wasn't found
                    metadataOutcome[metaVariables[i]] = false;
                    continue;
                }

                index = index.index;
                let openIndex;
                for (let j = index; j >= 0; j--)
                if (html.charAt(j) === '<') {
                    openIndex = j;
                    break;
                }
                // Make sure tag isn't empty
                const tag = html.substring(openIndex, html.indexOf('>', openIndex));
                let attributeIndex; 
                if (metaTags[i].rel)
                    attributeIndex = tag.indexOf('href=') + 5;
                    else
                    attributeIndex = tag.indexOf('content=') + 8;
                // Make sure the attribute actually exists
                if (attributeIndex === 4 || attributeIndex === 7) {
                    metadataOutcome[metaVariables[i]] = false;
                    continue;
                }

                const charAfter = tag.charAt(attributeIndex);
                const variableOutcome = 
                    // Make sure it's not just quotes with nothing
                    (charAfter === '"' && tag.charAt(attributeIndex + 1) !== '"')
                        || (charAfter !== '"' && charAfter !== ' ' && charAfter !== '/' && charAfter !== '>');
                metadataOutcome[metaVariables[i]] = variableOutcome;

                if (metaVariables[i] === 'robots') {
                    robotsOutcome.valid = robotsOutcome.valid || variableOutcome;
                    robotsOutcome.source = robotsOutcome.source || (variableOutcome && 'meta');

                    let content;
                    switch (variableOutcome && charAfter) {
                        case false:
                            break;
                        case '"':
                            // Get text between quotes
                            content = tag.substring(attributeIndex + 1, tag.indexOf('"'));
                            break;
                        default:
                            // If there's no quotes, get the text up to the next space or close of the tag
                            const spaceIndex = tag.indexOf(' ', attributeIndex);
                            if (spaceIndex === -1) 
                                content = tag.substring(attributeIndex + 1);
                            content = tag.substring(attributeIndex + 1, spaceIndex);

                            break;
                    }

                    robotsOutcome.allowed = robotsOutcome.allowed || (variableOutcome && !(content.includes('nofollow') && content.includes('noindex')));
                }
                // Check for CSP meta tag
                // https://guides.18f.gov/engineering/security/content-security-policy/#client-side-implementation
                else if (!security.csp && metaVariables[i] === 'contentSecurityPolicy')
                    security.csp = variableOutcome;
            }

            metadataResults.push(metadataOutcome);
            if (!security.maxAge) {
                security.maxAge = -1;
                security.expireTime = -1;
            }
            security.csp = !!security.csp;

            // Get all links on home page for sitemap validation
            const links = new Set();
            let aIndex = -1;
            while ((aIndex = html.indexOf('<a ', aIndex + 1)) > -1) {
                const hrefStart = html.indexOf('href=', aIndex) + 5;
                let link;
                if (html.charAt(hrefStart) === '"')
                    link = html.substring(hrefStart + 1, html.indexOf('"', hrefStart + 2));
                    else
                    link = html.substring(hrefStart, Math.min(html.indexOf(' ', hrefStart), html.indexOf('>', hrefStart)));
                let urlObject;
                if (link.includes('/') && (urlObject = new URL(link, res.url)).hostname === res.req.host)
                    links.add(urlObject.pathname.substring(0, urlObject.pathname.length - (urlObject.pathname.endsWith('/') ? 1 : 0)));
            }
            if (debug)
                console.log(links);
            const linksLength = links.size;

            let robotsUrl = protocol, securityUrl = protocol, securityUrlWellKnown = protocol;
            if (useWww) {
                robotsUrl += 'www.';
                securityUrl += 'www.';
                securityUrlWellKnown += 'www.';
            }
            robotsUrl += domain + '/robots.txt';
            securityUrl += domain + '/security.txt';
            securityUrlWellKnown += domain + '/.well-known/security.txt';

            await Promise.all([
                // Robots
                fetch(robotsUrl, httpAgent, httpsAgent, visited).then(async robots => {
                    // Check robots file for sitemap
                    let sitemapUrl = null, allowed = true;
                    if (robots.data) {
                        let readingAllows = false;

                        robots.data = robots.data.split('\n');
                        for (let i = 0; i < robots.data.length; i++) {
                            const line = robots.data[i];

                            // Check for sitemap URL
                            if (!sitemapUrl && line.startsWith('Sitemap')) {
                                sitemapUrl = line.substring(8).trim();
                                if (sitemapUrl.startsWith('/'))
                                    sitemapUrl = robots.req.protocol + '//' + domain + sitemapUrl;
                                break;
                            }

                            // Check if the home page is allowed
                            if (line.startsWith('User-agent:')) {
                                const agent = line.substring(11).trim();
                                if (agent === '*' || agent === headers['User-Agent'] || agent === 'Googlebot' || agent === 'Bingbot')
                                    readingAllows = true;
                            }
                            else if (readingAllows) {
                                if (line.includes('llow:')) {
                                    const allowLine = line.charAt(0) === 'A';
                                    const path = line.substring(9).trim().replaceAll('*', '.*');
                                    if (path.length === 0 && !allowLine)
                                        allowed = true;
                                        else if (new RegExp(path, 'g').test(res.req.path))
                                            allowed = allowLine;
                                    }
                                else
                                readingAllows = false;
                            }
                        }
                    }

                    // Merge data into robots outcome in case the metadata scraper already put data in
                    Object.assign(robotsOutcome, { 
                        status: robots.statusCode, url: domain, name, redirect: robots.url
                    });
                    robotsOutcome.sitemap = sitemapUrl;
                    const xRobots = res.headers && res.headers['x-robots-tag'];
                    const validFile = (robots.statusCode < 300 && robots.url.toLowerCase().endsWith('/robots.txt'));
                    const valid = validFile || !!xRobots || (!!robots.headers && robots.headers['content-type'].startsWith('text/plain'));
                    robotsOutcome.valid = robotsOutcome.valid || valid;
                    robotsOutcome.allowed = robotsOutcome.allowed || (valid && allowed) || (!!xRobots && !xRobots.includes('nofollow') && !xRobots.includes('noindex'));
                    robotsOutcome.source = (validFile && 'robots.txt') || robotsOutcome.source || (!!xRobots && 'x-robots-tag');

                    if (sitemapUrl)
                        sitemapUrl = isValidUrl(sitemapUrl);
                    if (!sitemapUrl) {
                        sitemapUrl = protocol;
                        if (useWww)
                            sitemapUrl += 'www.';
                        sitemapUrl += domain + '/sitemap.xml';
                    }

                    // Sitemap
                    await fetch(sitemapUrl, httpAgent, httpsAgent, visited).then(async sitemap => {
                        let items = 0, pdfs = 0;
                        const visitedSitemaps = [sitemap.url], sitemapPromises = [];

                        const checkSitemap = data => {
                            if (data !== null) {
                                // Count items in sitemap
                                let index = -1;
                                while ((index = data.indexOf('<url>', index + 1)) > -1) {
                                    // Check if URL is on homepage
                                    const urlStartIndex = data.indexOf('<loc>', index) + 5;
                                    let itemPath = new URL(data.substring(urlStartIndex, data.indexOf('</loc>', urlStartIndex)), res.url).pathname.toLowerCase();
                                    if (itemPath.endsWith('/'))
                                        itemPath = itemPath.substring(0, itemPath.length - 1);
                                    links.delete(itemPath);

                                    items++;
                                }
                                // Count PDFs in sitemap
                                index = data.indexOf('.pdf');
                                while (index > -1) {
                                    index = data.indexOf('.pdf', index + 1);
                                    pdfs++;
                                }
                                // Check for other sitemaps in the file
                                index = -1;
                                while ((index = data.indexOf('<sitemap>', index + 1)) > -1 && visitedSitemaps.length < 75 /* Cap amount of requests */) {
                                    const urlStartIndex = data.indexOf('<loc>', index) + 5;
                                    const sitemapHref = new URL(data.substring(urlStartIndex, data.indexOf('</loc>', urlStartIndex)), res.url).href;
                                    if (visitedSitemaps.includes(sitemapHref))
                                        continue;

                                    visitedSitemaps.push(sitemapHref);
                                    if (debug)
                                        console.log('Reading additional sitemap #', visitedSitemaps.length, 'at', sitemapHref);
                                    sitemapPromises.push(fetch(sitemapHref, httpAgent, httpsAgent, visited, true).then(res => res.data).then(checkSitemap));
                                }
                            };
                        };

                        checkSitemap(sitemap.data);
                        await Promise.all(sitemapPromises);

                        if (debug)
                            console.log('Leftover home links:', links);

                        sitemapOutcome = { url: domain, name, status: sitemap.statusCode, redirect: sitemap.url,
                            xml: sitemap.url.endsWith('.xml') && sitemap.statusCode < 300 && !!sitemap.headers && (sitemap.headers['content-type'].startsWith('text/xml') || sitemap.headers['content-type'].startsWith('application/xml')),
                            items,
                            pdfs,
                            completion: 1 - (links.size / linksLength || 0)
                        };
                        sitemapResults.push(sitemapOutcome);
                    });
                }),

                // security.txt
                fetch(securityUrl, httpAgent, httpsAgent, visited, true, 'HEAD').then(async res => {
                    if (res.statusCode < 300 && res.headers['content-type'].startsWith('text/plain') && res.url.endsWith('security.txt'))
                        security.securityTxt = true;
                    else {
                        res = await fetch(securityUrlWellKnown, httpAgent, httpsAgent, visited, true, 'HEAD');
                        security.securityTxt = res.statusCode < 300 && res.headers['content-type'].startsWith('text/plain') && res.url.endsWith('security.txt');
                    }
                })
            ]);
        }
        else {
            // No response

            robotsOutcome = {
                status: res.statusCode,
                url: domain,
                name,
                redirect: res.url,
                sitemap: null,
                valid: false,
                allowed: false
            }

            metadataOutcome = { status: res.statusCode, url: domain, name, redirect: undefined };
            for (let i = 0; i < metaVariables.length; i++)
            metadataOutcome[metaVariables[i]] = false;
            metadataResults.push(metadataOutcome);

            sitemapOutcome = { url: domain, name, status: res.statusCode, redirect: undefined, xml: false, items:0, pdfs: 0, completion: 0 };
            sitemapResults.push(sitemapOutcome);

            security.securityTxt = false;
        }

        robotsResults.push(robotsOutcome);
        securityResults.push(security);

        if (debug) {
            console.log(domain, 'URL', urlOutcome);
            console.log(domain, 'metadata', metadataOutcome);
            console.log(domain, 'robots', robotsOutcome);
            console.log(domain, 'sitemap', sitemapOutcome);
            console.log(domain, 'security', security);
        }

        done++;
        const timeRemaining = Math.round((Date.now() - startTime) / done * domains.length / 1000);
        console.log(i, 'Done with ' + domain + ', ' + domains.length + '/' + Math.round(timeRemaining / 60).toString().padStart(2, '0') + ':' + (timeRemaining % 60).toString().padStart(2, '0') + ' remaining');

        httpAgent.destroy();
        httpsAgent.destroy();
    };

    resolve();
}));

await Promise.all(scrapers);

const time = Date.now();
for (let i = 2; i < process.argv.length; i++)
if (process.argv[i] === '--no-writes') {
    const endTime = Math.round((Date.now() - startTime) / 1000);
    console.log('Done in ' + Math.round(endTime / 60).toString().padStart(2, '0') + ':' + (endTime % 60).toString().padStart(2, '0'))
    exit(0);
}
// Add to the history/changelog
// The time the history was updated
console.log('History');
// URL history
let csv = 'domain,agency,status,redirect,https,dot_gov,www';
for (let j = 0; j < urlResults.length; j++) {
    const result = urlResults[j];
    csv += '\n' + result.url + ',"' + result.name + '",' + result.status + ',"' + result.redirect + '",' + result.https + ',' + result.dotgov + ',' + result.www;

    let found = false;

    for (let i = 0; i < urlHistory.length; i++)
    if (urlHistory[i].url === result.url) {
        found = true;
        const currentVersion = urlHistory[i];

        result.history = currentVersion.history || [];

        if (currentVersion.status !== result.status || currentVersion.redirect !== result.redirect || currentVersion.https !== result.https || currentVersion.www !== result.www || currentVersion.dotgov !== result.dotgov)
            result.history.push({ time, 
                status: currentVersion.status,
                redirect: currentVersion.redirect,
                https: currentVersion.https,
                www: currentVersion.www,
                dotgov: currentVersion.dotgov,
            });

        urlHistory.slice(i, 1);
        break;
    }

    if (!found)
        result.history = [];
}
writeFileSync('public/data/url.csv', csv);
console.log('Done with URL history');

// Metadata history
csv = 'domain,redirect,agency,status,' + metaCsvVariables.join(',');
for (let j = 0; j < metadataResults.length; j++) {
    const result = metadataResults[j];
    csv += '\n' + result.url + ',"' + result.redirect + '","' + result.name + '",' + result.status;
    for (let i = 0; i < metaVariables.length; i++)
    csv += ',' + result[metaVariables[i]];

    let found = false;

    for (let i = 0; i < metadataHistory.length; i++)
    if (metadataHistory[i].url === metadataResults[j].url) {
        found = true;
        const currentVersion = metadataHistory[i];

        let changed = false;
        for (let k = 0; k < metaVariables.length; k++)
        changed = changed || currentVersion[metaVariables[k]] !== metadataResults[j][metaVariables[k]];

        metadataResults[j].history = currentVersion.history || [];
        if (changed) {
            let oldVersion = { time, status: currentVersion.status };
            for (let l = 0; l < metaVariables.length; l++)
            oldVersion[metaVariables[l]] = currentVersion[metaVariables[l]];
            metadataResults[j].history.push(oldVersion);
        }

        metadataHistory.slice(i, 1);
        break;
    }

    if (!found)
        metadataResults[j].history = [];
}
writeFileSync('public/data/metadata.csv', csv);
console.log('Done with metadata history');

// Robots history
csv = 'domain,agency,status,redirect,valid,sitemap,allowed,source';
for (let j = 0; j < robotsResults.length; j++) {
    const result = robotsResults[j];
    csv += '\n' + result.url + ',"' + result.name + '",' + result.status + ',"' + result.redirect + '",' + result.valid + ',"' + result.sitemap + '",' + result.allowed + ',' + result.source;

    let found = false;

    for (let i = 0; i < robotsHistory.length; i++)
    if (robotsHistory[i].url === result.url) {
        found = true;
        const currentVersion = robotsHistory[i];

        result.history = currentVersion.history || [];
        if (currentVersion.status !== result.status || currentVersion.valid !== result.valid || currentVersion.allowed !== result.allowed || currentVersion.sitemap !== result.sitemap || currentVersion.source !== result.source)
            result.history.push({ time, 
                status: currentVersion.status,
                redirect: currentVersion.redirect,
                valid: currentVersion.valid,
                allowed: currentVersion.allowed,
                sitemap: currentVersion.sitemap,
                source: currentVersion.source
            });

        robotsHistory.slice(i, 1);
        break;
    }

    if (!found)
        result.history = [];
}
writeFileSync('public/data/robots.csv', csv);
console.log('Done with robots history');

// Sitemap history
csv = 'domain,agency,status,redirect,xml,items,pdfs,completion';
for (let j = 0; j < sitemapResults.length; j++) {
    const result = sitemapResults[j];
    csv += '\n' + result.url + ',"' + result.name + '",' + result.status + ',"' + result.redirect + '",' + result.xml + ',' + result.items + ',' + result.pdfs + ',' + result.completion;

    let found = false;

    for (let i = 0; i < sitemapHistory.length; i++)
    if (sitemapHistory[i].url === result.url) {
        found = true;
        const currentVersion = sitemapHistory[i];

        result.history = currentVersion.history || [];
        if (currentVersion.status !== result.status || currentVersion.redirect !== result.redirect || currentVersion.xml !== result.xml || currentVersion.items !== result.items)
            result.history.push({ time, 
                status: currentVersion.status,
                redirect: currentVersion.redirect,
                xml: currentVersion.xml,
                items: currentVersion.items,
                pdfs: currentVersion.pdfs,
                completion: currentVersion.completion
            });

        sitemapHistory.slice(i, 1);
        break;
    }

    if (!found)
        result.history = [];
}
writeFileSync('public/data/sitemap.csv', csv);
console.log('Done with sitemap history');

// Security history
csv = 'domain,agency,status,hsts,max_age,expire_time,csp,x_content_type_options,security_txt';
for (let i = 0; i < securityResults.length; i++) {
    const result = securityResults[i];
    csv += '\n' + result.url + ',"' + result.name + '",' + result.status + ',' + result.hsts + ',' + result.maxAge + ',' + result.expireTime + ',' + result.csp + ',' + result.xContentTypeOptions + ',' + result.securityTxt;

    let found = false;

    for (let j = 0; j < securityHistory.length; j++)
    if (securityHistory[j].url === result.url) {
        found = true;
        const currentVersion = securityHistory[j];

        result.history = currentVersion.history || [];
        if (currentVersion.status !== result.status || currentVersion.hsts !== result.hsts || currentVersion.maxAge !== result.maxAge || currentVersion.csp !== result.csp || currentVersion.xContentTypeOptions !== result.xContentTypeOptions || currentVersion.securityTxt !== result.securityTxt)
            result.history.push({ time,
                status: currentVersion.status,
                hsts: currentVersion.hsts,
                maxAge: currentVersion.maxAge,
                csp: currentVersion.csp,
                xContentTypeOptions: currentVersion.xContentTypeOptions
            });

        securityHistory.slice(i, 1);
        break;
    }

    if (!found)
        result.history = [];
}
writeFileSync('public/data/security.csv', csv);
console.log('Done with security history');

writeFileSync('public/data/url.json', JSON.stringify(urlResults));
writeFileSync('public/data/metadata.json', JSON.stringify(metadataResults));
writeFileSync('public/data/robots.json', JSON.stringify(robotsResults));
writeFileSync('public/data/sitemap.json', JSON.stringify(sitemapResults));
writeFileSync('public/data/security.json', JSON.stringify(securityResults));
writeFileSync('public/data/updated_time', Date.now().toString());

const endTime = Math.round((Date.now() - startTime) / 1000);
console.log('Done in ' + Math.round(endTime / 60).toString().padStart(2, '0') + ':' + (endTime % 60).toString().padStart(2, '0'))
