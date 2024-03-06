import { writeFileSync, readFileSync } from 'fs';
import pThrottle from 'p-throttle';
import fetch from 'node-fetch';
import { exit } from 'process';

const start = Date.now();

// Tags to search for
const properties = ['<title', 'name="description"', 'name="keywords"', 'name="robots"', 'name="viewport"', 'rel="canonical"',
    'property="og:locale"', 'property="og:site_name"', 'property="og:type"', 'property="og:title"', 'property="og:description"', 'property="og:url"',
    'property="og:image"', 'property="og:image:width"', 'property="og:image:height"', 'property="og:image:alt"', 'name="twitter:site"', 'name="twitter:card"',
    'name="twitter:title"', 'name="twitter:description"', 'name="twitter:image"']
    // Regular expressions for tags
    .map(property => { return { string: property, regex: new RegExp(property.replaceAll('"', '("|)'), 'm') } });
// Their names in the code
const variables = [
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
const csvVariables = [
    'Title',
    'Description',
    'Keywords',
    'Robots',
    'Viewport',
    'Canonical',
    'OG Locale',
    'OG Site Name',
    'OG Type',
    'OG Title',
    'OG Description',
    'OG Url',
    'OG Image',
    'OG Image Width',
    'OG Image Height',
    'OG Image Alt',
    'Twitter Card',
    'Twitter Title',
    'Twitter Description',
    'Twitter Image'
];

// Initialize data
let historyData = readFileSync('data/data.json', 'utf8');
historyData = historyData.includes('[') ? JSON.parse(historyData) : [];
const outcomes = [];

let done = 0;
const fetchPromise = domain => {
    return new Promise(async (resolve, reject) => {
        // Timeout requests
        const controller = new AbortController();
        const signal = controller.signal;
        const timeout = setTimeout(() => {
            console.error('Aborting', domain.url);
            clearTimeout(timeout);
            controller.abort();
            reject('Timeout');
        }, 60000);
        const options = {
            method: 'GET',
            signal,
            headers: {
                'User-Agent': 'CivicHackingAgency/1.0 gov-metadata',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*\/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
            }
        };
        let outcome;
        const fetchStart = Date.now();
        (domain.redirect ?
            fetch(domain.redirect, options).then(async res => {
                const fetchEnd = Date.now();
                let data = await res.text();
                data = data.replaceAll('\'', '"').toLowerCase();
                let url;

                // Get data before update
                const past = historyData.find(h => h.url === domain.url);
                let history = (past && past.history) ? past.history : [];
                let oldData = { time: Date.now(), status: past ? past.status : null };
                if (past)
                    for (let i = 0; i < variables.length; i++)
                        oldData[variables[i]] = past[variables[i]];
                let changed = false;

                const redirect = url || res.url;
                let tld = redirect.substring(redirect.indexOf('//') + 2);
                tld = tld.substring(0, tld.indexOf('/'));
                tld = tld.substring(tld.lastIndexOf('.') + 1);

                // Initialize result
                outcome = {
                    status: res.status,
                    url: domain.url,
                    name: domain.name,
                    redirect,
                    dotgov: tld == 'gov',
                    https: res.url.startsWith('https://'),
                    responseTime: fetchEnd - fetchStart
                    //sitemap
                };

                // Check for properties
                for (let i = 0; i < properties.length; i++) {
                    if (res.status == 200) {
                        let index = data.match(properties[i].regex);
                        if (!index) {
                            outcome[variables[i]] = false;
                            continue;
                        }
                        if (i == 0) {
                            outcome[variables[i]] = true;
                            continue;
                        }
                        index = index.index;
                        let openIndex;
                        for (let j = index; j >= 0; j--)
                            if (data[j] == '<') {
                                openIndex = j;
                                break;
                            }
                        // Ensure the tag isn't blank
                        const tag = data.substring(openIndex, data.indexOf('>', openIndex));
                        const contentIndex = tag.indexOf((properties[i].string.includes('rel') ? 'href=' : 'content='));
                        const contentLength = properties[i].string.includes('rel') ? 5 : 8;
                        if (contentIndex == -1) {
                            outcome[variables[i]] = false;
                            continue;
                        }
                        const charAfter = tag.charAt(contentIndex + contentLength);
                        outcome[variables[i]] = (charAfter == '"' && tag.charAt(contentIndex + contentLength + 1) != '"') || (charAfter != '"' && charAfter != ' ' && charAfter != '/' && charAfter != '>');
                    }
                    else
                        outcome[variables[i]] = false;

                    if (!changed && oldData[variables[i]] != outcome[variables[i]])
                        changed = true;
                }

                // Push to history
                if (changed && past)
                    history.push(oldData);
                outcome.history = history;
                outcomes.push(outcome);
            })
            : new Promise((resolve, reject) => {
                throw new Error(domain.status.toString())
            })).catch(err => {
                const status = (err.name === 'AbortError' ? 408 : 500);
                outcome = { status, url: domain.url, name: domain.name };
                const past = historyData.find(h => h.url === domain.url);
                let history = (past && past.history) ? past.history : [];
                let oldData = { time: Date.now(), status: past ? past.status : null };
                if (past)
                    for (let i = 0; i < variables.length; i++)
                        oldData[variables[i]] = past[variables[i]];
                if (status != past.status)
                    history.push(oldData);
                outcome.history = history;
                for (let i = 0; i < properties.length; i++)
                    outcome[variables[i]] = false;
                outcomes.push(outcome);

                console.error(domain.url, err);
            }).finally(() => {
                clearTimeout(timeout);

                done++;
                let total = 0;
                for (let i = 0; i < variables.length; i++)
                    if (outcome[variables[i]])
                        total++;
                console.log(`Done with ${domain.url} (${outcome.status}, ${total}/${variables.length}) ${done}/${promises.length} ${Math.round(done / promises.length * 100)}% in ${(Math.round((Date.now() - start) / 1000 / 60)).toString().padStart(2, '0')}:${(Math.round((Date.now() - start) / 1000) % 60).toString().padStart(2, '0')}`);

                resolve();
            });
    })
};

// Limit request speed to prevent timeouts
const throttleFetch = pThrottle({
    limit: 5,
    interval: 1000
})(fetchPromise);

// https://github.com/cisagov/dotgov-data/blob/main/current-federal.csv
let agencies = JSON.parse(readFileSync('data/url.json', 'utf8'));

const promises = [];
let domain = process.argv[2];
for (let i = 0; i < agencies.length; i++) {
    const name = agencies[i].name;
    // Check if only scraping one site
    if (!domain || (domain && domain == name))
        promises.push(throttleFetch(agencies[i]).catch(err => console.error(err)));
    // Only update the selected domain
    else {
        let agencyData;
        for (let j = 0; j < historyData.length; j++)
            if (historyData[j].url == name) {
                agencyData = historyData[j];
                break;
            }
        if (agencyData)
            outcomes.push(agencyData);
    }
}

await Promise.all(promises);
console.log('Done fetching');

writeFileSync('data/data.json', JSON.stringify(outcomes));

let csv = 'Domain,Redirect,Agency,Status,Response Time,' + csvVariables.join(',') + '\n';
for (const agency of outcomes) {
    csv += agency.url + ',' + agency.redirect + ',' + agency.name + ',' + agency.status + ',' + agency.responseTime;
    for (let i = 0; i < variables.length; i++)
        csv += ',' + agency[variables[i]];
    csv += '\n';
}
writeFileSync('data/data.csv', csv);

console.log('Done writing');