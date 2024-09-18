import http from 'http';
import https from 'https';
import zlib from 'zlib';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import readlineSync from 'readline-sync';

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
const metaTags = ['<title', 'name="description"', 'name="keywords"', 'name="robots"', 'name="viewport"', 'rel="canonical"',
    'property="og:locale"', 'property="og:site_name"', 'property="og:type"', 'property="og:title"', 'property="og:description"', 'property="og:url"',
    'property="og:image"', 'property="og:image:width"', 'property="og:image:height"', 'property="og:image:alt"', 'name="twitter:site"', 'name="twitter:card"',
    'name="twitter:title"', 'name="twitter:description"', 'name="twitter:image"']
// Regular expressions for tags
    .map(property => { return { rel: property.includes('rel'), regex: new RegExp(property.replaceAll('"', '("|)'), 'm') } });
// Their names in the code
const metaVariables = [
    'title',
    'description',
    'keywords',
    'robots',
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
const finishRequest = (resolve, res, data, url) => {
    res.headers['content-type'] = res.headers['content-type'] || 'undefined';
    resolve({ req: res.req, statusCode: res.statusCode, headers: res.headers, data, url });
}

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

const fetch = (url, httpAgent, httpsAgent, visited) => 
    new Promise((resolve, reject) => {
        // Use the correct protocol
        const secure = url.startsWith('https');
        try {
            const req = (secure ? https : http)
                .get(url, { agent: secure ? httpsAgent : httpAgent, headers, timeout }, res => {
                    // Remove timeout handler
                    req.socket.off('timeout', req.abort);

                    visited.push(url);
                    let redirects = 0;

                    // Handle non-OK responses
                    if (res.statusCode >= 300) {
                        // Consume response to free the socket
                        res.resume();
                        // Redirection
                        const valid = isValidUrl(res.headers.location, req.protocol + '//' + req.host);
                        if (res.statusCode < 400 && valid && !visited.includes(valid))
                            fetch(valid, httpAgent, httpsAgent, visited).then(resolve);
                        // The response is an error
                        else
                            finishRequest(resolve, res, null, url);
                        return;
                    }

                    // Receive and decompress data
                    let data = '';
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
                            res.setEncoding('utf8');
                            stream = res;
                            break;
                    }
                    stream.on('data', chunk => data += chunk.toString());

                    // Check for meta redirect and finish request
                    stream.on('end', () => { 
                        let html;
                        // Get the http-equiv redirect
                        // https://www.w3.org/TR/WCAG20-TECHS/H76.html#H76-description
                        if (res['content-type'] === 'text/html' && (html = data.toLowerCase()).includes('http-equiv="refresh"')) {
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

                            // Make it a complete URL
                            /* if (!redirectUrl.startsWith('http')) {
                                if (redirectUrl.startsWith('/'))
                                    redirectUrl = req.host + redirectUrl;
                                if (redirectUrl.startsWith('://'))
                                    redirectUrl = req.protocol.substring(0, req.protocol.length - 1) + redirectUrl;
                                else
                                    redirectUrl = req.protocol + '//' + redirectUrl;
                            } */

                            // Continue requests 
                            const valid = isValidUrl(redirectUrl, req.protocol + '//' + req.host);
                            if (visited.includes(redirectUrl) || (redirects++) >= 5 || !valid)
                                finishRequest(resolve, res, data, url);
                            else 
                                fetch(valid, httpAgent, httpAgent, visited).then(resolve);
                        }
                        else
                            finishRequest(resolve, res, data, url);
                    });
                })
                .on('socket', s => {
                    s.setTimeout(timeout);
                    s.on('timeout', req.abort);
                })
                .on('error', e => { console.error(e.code, e.syscall, url); resolve({ req, statusCode: 500, data: null, url }); });
        }
        catch (e) {
            console.error(e, url);
            resolve({ req, statusCode: 500, data: null, url });
        }
    });

const urlResults = [], metadataResults = [], robotsResults = [], sitemapResults = [];
const urlHistory = existsSync('data/url.json') ? JSON.parse(readFileSync('data/url.json')) : [],
    sitemapHistory = existsSync('data/sitemap.json') ? JSON.parse(readFileSync('data/sitemap.json')) : [],
    robotsHistory = existsSync('data/robots.json') ? JSON.parse(readFileSync('data/robots.json')) : [],
    metadataHistory = existsSync('data/metadata.json') ? JSON.parse(readFileSync('data/metadata.json')) : [];

const domainsCsv = readFileSync('data/domains.csv', 'utf8');
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
        }
    
    if (!found) {
        console.log('Domain ' + process.argv[2] + ' not found, adding it to list');    
        console.log('To cancel, press Ctrl+C');
        let org = readlineSync.question('Enter organization name: ').trim();
        if (org.includes(','))
            org = '"' + org + '"';
        const domain = process.argv[2] + ',' + org;
        domains = [ domain ];
        writeFileSync('data/domains.csv', domainsCsv + '\n' + domain);
    }
}

let done = 0, startTime = Date.now();
const scrapeDomain = async (httpAgent, httpsAgent) => {
    if (domains.length === 0)
        return;

    let domain = domains.shift();
    const name = domain.substring(domain.indexOf(',') + 1).replaceAll('"', '');
    domain = domain.substring(0, domain.indexOf(','));

    // URL
    let base = fetch('http://' + domain , httpAgent, httpsAgent, []);
    let www = fetch('http://www.' + domain , httpAgent, httpsAgent, []);
    const responses = await Promise.all([base, www]);
    base = responses[0], www = responses[1];
    // The response used to score HTTPS and TLD
    const res = base.statusCode < 300 ? base : www;

    const validWww = !!(base.req && www.req) && base.statusCode < 300 && www.statusCode < 300 && base.req.protocol === www.req.protocol && base.req.host === www.req.host && base.req.pathname === www.req.pathname;
    const useWww = www.statusCode < 300 && (validWww || base.statusCode >= 300);

    urlResults.push({ url: domain, name, status: res.statusCode, redirect: res.url, https: !!res.req && res.req.protocol === 'https:', 
        www: validWww,
        dotgov: !!res.req && !!res.req.host && (res.req.host.endsWith('.gov') || res.req.host.endsWith('.edu') || res.req.host.endsWith('.mil')) });

    let robotsOutcome = {}, robotsUrl = 'http://';
    if (useWww)
        robotsUrl += 'www.';
    robotsUrl += domain + '/robots.txt';

    if (res.statusCode < 300)
        await Promise.all([
            // Robots
            fetch(robotsUrl, httpAgent, httpsAgent, []).then(async robots => {
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
                    sitemapUrl = 'http://';
                    if (useWww)
                        sitemapUrl += 'www.';
                    sitemapUrl += domain + '/sitemap.xml';
                }
                        
                // Sitemap
                await fetch(sitemapUrl, httpAgent, httpsAgent, []).then(sitemap => {
                    let items = 0, pdfs = 0;
                    if (sitemap.data !== null) {
                        // Count items in sitemap
                        let index = sitemap.data.indexOf('<url>');
                        while (index > -1) {
                            index = sitemap.data.indexOf('<url>', index + 1);
                            items++;
                        }
                        // Count PDFs in sitemap
                        index = sitemap.data.indexOf('.pdf');
                        while (index > -1) {
                            index = sitemap.data.indexOf('.pdf', index + 1);
                            pdfs++;
                        }
                    }

                    sitemapResults.push({ url: domain, name, status: sitemap.statusCode, redirect: sitemap.url,
                        xml: sitemap.url.endsWith('.xml') && sitemap.statusCode < 300 && !!sitemap.headers && (sitemap.headers['content-type'].startsWith('text/xml') || sitemap.headers['content-type'].startsWith('application/xml')),
                        items,
                        pdfs
                    });
                });
            }),

            // Metadata
            new Promise((resolve, reject) => {
                const outcome = { status: res.statusCode, url: domain, name, redirect: res.url };
                if (res.statusCode >= 300)
                    for (let i = 0; i < metaVariables.length; i++) 
                        outcome[metaVariables[i]] = false;
                else {
                    const html = res.data.replaceAll('\'', '"').toLowerCase();

                    // Check for <title>
                    let index = html.match(metaTags[0].regex);
                    outcome.title = !!index && html.charAt(html.indexOf('>', index.index) + 1) !== '<';
                    // Other tags
                    for (let i = 1; i < metaTags.length; i++) {
                        index = html.match(metaTags[i].regex);
                        if (!index) {
                            // The tag wasn't found
                            outcome[metaVariables[i]] = false;
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
                            outcome[metaVariables[i]] = false;
                            continue;
                        }

                        const charAfter = tag.charAt(attributeIndex);
                        const variableOutcome = 
                            // Make sure it's not just quotes with nothing
                            (charAfter === '"' && tag.charAt(attributeIndex + 1) !== '"')
                            || (charAfter !== '"' && charAfter !== ' ' && charAfter !== '/' && charAfter !== '>');
                        outcome[metaVariables[i]] = variableOutcome;

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
                                    else
                                        content = tag.substring(attributeIndex + 1, spaceIndex);

                                    break;
                            }

                            robotsOutcome.allowed = robotsOutcome.allowed || (variableOutcome && !(content.includes('nofollow') && content.includes('noindex')));
                        }
                    }
                }

                metadataResults.push(outcome);

                resolve();
            })
        ]);
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
        
        const metadataOutcome = { status: res.statusCode, url: domain, name, redirect: undefined };
        for (let i = 0; i < metaVariables.length; i++)
            metadataOutcome[metaVariables[i]] = false;
        metadataResults.push(metadataOutcome);

        sitemapResults.push({ url: domain, name, status: res.statusCode, redirect: undefined, xml: false, items:0, pdfs: 0 });
    }

    robotsResults.push(robotsOutcome);

    done++;
    const timeRemaining = Math.round((Date.now() - startTime) / done * domains.length / 1000);
    console.log('Done with ' + domain, domains.length + ', ' + Math.round(timeRemaining / 60).toString().padStart(2, '0') + ':' + (timeRemaining % 60).toString().padStart(2, '0') + ' remaining');

    httpAgent.destroy();
    httpsAgent.destroy();
    
    await scrapeDomain(httpAgent, httpsAgent);

    return;
};

// Agents allow for keeping the connection alive
// This means the request doesn't have to do a DNS lookup and TLS handshake every time and only has to do it once
const scrapers = [];
for (let i = 0; i < 3 && i < domains.length; i++)
    scrapers.push(
        scrapeDomain(
            new http.Agent({ keepAlive: true, maxSockets: 1}), 
            new https.Agent({ keepAlive: true, maxSockets: 1})
        )
    );
await Promise.all(scrapers);

console.log('History');

// Add to the history/changelog
// The time the history was updated
const time = Date.now();
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
writeFileSync('data/url.csv', csv);
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
writeFileSync('data/metadata.csv', csv);
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
writeFileSync('data/robots.csv', csv);
console.log('Done with robots history');

// Sitemap history
csv = 'domain,agency,status,redirect,xml,items,pdfs';
for (let j = 0; j < sitemapResults.length; j++) {
    const result = sitemapResults[j];
    csv += '\n' + result.url + ',"' + result.name + '",' + result.status + ',"' + result.redirect + '",' + result.xml + ',' + result.items + ',' + result.pdfs;

    let found = false;

    for (let i = 0; i < sitemapHistory.length; i++)
        if (sitemapHistory[i].sitemap === result.sitemap) {
            found = false;
            const currentVersion = sitemapHistory[i];

            result.history = currentVersion.history || [];
            if (currentVersion.status !== result.status || currentVersion.redirect !== result.redirect || currentVersion.xml !== result.xml || currentVersion.items !== result.items)
                result.history.push({ time, 
                    status: currentVersion.status,
                    redirect: currentVersion.redirect,
                    xml: currentVersion.xml,
                    items: currentVersion.items,
                    pdfs: currentVersion.pdfs
                });

            sitemapHistory.slice(i, 1);
            break;
        }

    if (!found)
        result.history = [];
}
writeFileSync('data/sitemap.csv', csv);
console.log('Done with sitemap history');

writeFileSync('data/url.json', JSON.stringify(urlResults));
writeFileSync('data/metadata.json', JSON.stringify(metadataResults));
writeFileSync('data/robots.json', JSON.stringify(robotsResults));
writeFileSync('data/sitemap.json', JSON.stringify(sitemapResults));
writeFileSync('data/updated_time', Date.now().toString());
const endTime = Math.round((Date.now() - startTime) / 1000);
console.log('Done in ' + Math.round(endTime / 60).toString().padStart(2, '0') + ':' + (endTime % 60).toString().padStart(2, '0'))
