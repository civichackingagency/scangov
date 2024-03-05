import { scrape, options } from './scrape.js';
import { writeFileSync, readFileSync } from 'fs';

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
let historyData = readFileSync('data/metadata.json', 'utf8');
historyData = historyData.includes('[') ? JSON.parse(historyData) : [];
const outcomes = [];
const errors = [];

await scrape(async (domainData, resolve, reject) => {
    // Parse CSV
    domainData = domainData.split(',');
    domainData[0] = domainData[0].toLowerCase();

    // Timeout requests
    const controller = new AbortController();
    const timeout = setTimeout(() => {
        clearTimeout(timeout);
        console.error('Aborting', domainData[0]);
        controller.abort();
        reject('Timeout');
    }, 60000);
    let outcome;
    fetch('http://' + domainData[0], options).then(async res => {
        let data = await res.text();
        data = data.replaceAll('\'', '"').toLowerCase();
        let url;

        // Get data before update
        const past = historyData.find(h => h.url == domainData[0]);
        let history = (past && past.history) ? past.history : [];
        let oldData = { time: Date.now(), status: past ? past.status : null, /*sitemap: past ? past.sitemap : null,*/ dotgov: past ? past.dotgov : null, https: past ? past.https : null, redirect: past ? past.redirect : null, responseTime: past ? past.responseTime : null };
        if (past)
            for (let i = 0; i < variables.length; i++)
                oldData[variables[i]] = past[variables[i]];
        let changed = false;

        // Initialize result
        outcome = {
            status: res.status,
            url: domainData[0],
            name: capitalizeFirstLetters(domainData[2]),
        };

        // Check if the domain redirects in the http-equiv tag
        let recursions = 0;
        const checkForRefresh = async html => {
            if (recursions >= 5) {
                for (const variable of variables)
                    outcome[variable] = false;
                history.push(oldData);
                outcome.history = history;
            }
            else if (html.includes('http-equiv="refresh"')) {
                let index = html.indexOf('http-equiv="refresh"');
                index = html.indexOf('url=', index) + 4;
                let redirectUrl = html.substring(index);
                if (redirectUrl.startsWith('"'))
                    redirectUrl = redirectUrl.substring(1);
                redirectUrl = redirectUrl.substring(0, redirectUrl.indexOf('"'));
                if (!redirectUrl.startsWith('//') && redirectUrl.startsWith('/'))
                    redirectUrl = (url || ('http://' + domainData[0])) + redirectUrl;
                url = redirectUrl;

                data = (await (await fetch(redirectUrl)).text()).replaceAll('\'', '"').toLowerCase();
                recursions++;
                await checkForRefresh(data);
            }
        }
        await checkForRefresh(data);

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
    }).catch(err => {
        const status = (err.name === 'AbortError' ? 408 : 500);
        outcome = { status, url: domainData[0], name: capitalizeFirstLetters(domainData[2]) };
        const past = historyData.find(h => h.url == domainData[0]);
        let history = (past && past.history) ? past.history : [];
        let oldData = { time: Date.now(), status: past ? past.status : null, /*sitemap: past ? past.sitemap : null,*/ dotgov: past ? past.dotgov : null, https: past ? past.https : null, redirect: past ? past.redirect : null, responseTime: past ? past.responseTime : null };
        if (past)
            for (let i = 0; i < variables.length; i++)
                oldData[variables[i]] = past[variables[i]];
        if (status != past.status)
            history.push(oldData);
        outcome.history = history;
        for (let i = 0; i < properties.length; i++)
            outcome[variables[i]] = false;
        outcomes.push(outcome);

        try {
            errors.push({ agencyData: domainData, error: err.name + ': ' + err.message });
            JSON.stringify(errors);
        }
        catch (err) {
            errors.pop();
        }

        console.error(domainData[0], err);
    }).finally(() => {
        clearTimeout(timeout);

        done++;
        let total = 0;
        for (let i = 0; i < variables.length; i++)
            if (outcome[variables[i]])
                total++;
        console.log(`Done with ${domainData[0]} (${outcome.status}, ${total}/${variables.length}) ${done}/${promises.length} ${Math.round(done / promises.length * 100)}% in ${(Math.round((Date.now() - start) / 1000 / 60)).toString().padStart(2, '0')}:${(Math.round((Date.now() - start) / 1000) % 60).toString().padStart(2, '0')}`);

        resolve();
    });
}, process.argv[2]);
console.log('Done fetching');

writeFileSync('data/metadata.json', JSON.stringify(outcomes));

let csv = 'Domain,Agency,Status,' + csvVariables.join(',') + '\n';
for (const agency of outcomes) {
    csv += agency.url + ',' + ',' + agency.name + ',' + agency.status + ',';
    for (let i = 0; i < variables.length; i++)
        csv += ',' + agency[variables[i]];
    csv += '\n';
}
writeFileSync('data/metadata.csv', csv);

writeFileSync('data/metadata_errors.json', JSON.stringify(errorData));

const errorData = JSON.parse(readFileSync('data/metadata_errors.json', 'utf8'));
let errorCsv = 'Domain,Error,Email\n';
for (const error of errorData)
    errorCsv += error.agencyData[0] + ',"' + error.error.replaceAll('\n', ' ') + '",' + error.agencyData[6] + '\n';
writeFileSync('data/metadata_errors.csv', errorCsv);
console.log('Done writing');
exit();