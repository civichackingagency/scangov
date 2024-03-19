import { writeFileSync, readFileSync } from 'fs';
import fetch from 'node-fetch';
import { exit } from 'process';
import { options, scrape } from './scrape.js';

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

// Initialize data
let historyData = readFileSync('data/metadata.json', 'utf8');
historyData = historyData.includes('[') ? JSON.parse(historyData) : [];
const outcomes = [];

const queue = [];
const domains = JSON.parse(readFileSync('data/url.json'));
const specificDomain = process.argv[2];
for (const domain of domains)
    if (!specificDomain || specificDomain === domain.url)
        queue.push({ url: domain.url, redirect: domain.redirect, name: domain.name, status: domain.status });
    else
        outcomes.push(historyData.find(h => h.url === domain.url));

let done = 0;
const start = Date.now();
await scrape(queue, args => new Promise(async (resolve, reject) => {
    // Timeout requests
    const controller = new AbortController();
    const signal = controller.signal;
    const timeout = setTimeout(() => {
        console.error('Aborting', args.url);
        controller.abort();
        clearTimeout(timeout);
        error(408);
    }, 30000);

    let outcome;

    const finish = () => {
        clearTimeout(timeout);

        done++;
        let total = 0;
        for (let i = 0; i < variables.length; i++)
            if (outcome[variables[i]])
                total++;
        console.log(`Done with ${args.url} (${outcome.status}, ${total}/${variables.length}) ${done}/${domains.length} ${Math.round(done / domains.length * 100)}% in ${(Math.round((Date.now() - start) / 1000 / 60)).toString().padStart(2, '0')}:${(Math.round((Date.now() - start) / 1000) % 60).toString().padStart(2, '0')}`);

        resolve();
    };

    const error = status => {
        outcome = { status, url: args.url, name: args.name, redirect: args.redirect };
        const past = historyData.find(h => h.url === args.url);
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

        console.error(args.url, status);

        finish();
    };

    if (args.status < 300) {
        const res = await fetch(args.redirect, {
            ...options,
            signal
        }).catch(err => {
            error(500);
        });
        if (!res)
            return;

        outcome = { status: res.status, url: args.url, name: args.name, redirect: args.redirect };
        let data = await res.text();
        data = data.replaceAll('\'', '"').toLowerCase();

        // Get data before update
        const past = historyData.find(h => h.url === args.url);
        let history = (past && past.history) ? past.history : [];
        let oldData = { time: Date.now(), status: past ? past.status : null };
        if (past)
            for (let i = 0; i < variables.length; i++)
                oldData[variables[i]] = past[variables[i]];
        let changed = false;

        for (let i = 0; i < properties.length; i++) {
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

            if (!changed && oldData[variables[i]] != outcome[variables[i]])
                changed = true;
        }

        if (changed && past)
            history.push(oldData);
        outcome.history = history;
        outcomes.push(outcome);

        finish();
    }
    else
        error(args.status)
}), 5, 750);

writeFileSync('data/metadata.json', JSON.stringify(outcomes));

let csv = 'domain,redirect,agency,status,' + csvVariables.join(',') + '\n';
for (const outcome of outcomes) {
    csv += outcome.url + ',"' + outcome.redirect + '","' + outcome.name + '",' + outcome.status;
    for (let i = 0; i < variables.length; i++)
        csv += ',' + outcome[variables[i]];
    csv += '\n';
}
writeFileSync('data/metadata.csv', csv);

console.log('Done writing');