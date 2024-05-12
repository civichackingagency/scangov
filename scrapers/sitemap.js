import { existsSync, readFileSync, writeFileSync } from 'fs';
import fetch from 'node-fetch';
import { scrape, options, /*domains */ } from './scrape.js';
import { exit } from 'process';

const outcomes = [];
const historyData = existsSync('data/sitemap.json') ? JSON.parse(readFileSync('data/sitemap.json', 'utf8')) : [];
const queue = [];
const specificDomain = process.argv[2];
/*for (const domain of domains) {
    const domainData = domain.split(',');
    if (!specificDomain || specificDomain === domainData[0].toLowerCase())
        queue.push({ url: domainData[0].toLowerCase(), name: domainData[1] });
    else
        outcomes.push(historyData.find(d => d.url === domainData[0].toLowerCase()));
}*/
const domains = JSON.parse(readFileSync('data/robots.json', 'utf8'));
for (const domain of domains) {
    if (!specificDomain || specificDomain === domain.url.toLowerCase())
        queue.push({ url: domain.url.toLowerCase(), name: domain.name, sitemap: domain.sitemap });
    else
        outcomes.push(historyData.find(d => d.url === domain.url.toLowerCase()));
}

let done = 0;
const start = Date.now();
await scrape(queue, args => new Promise(async (resolve, reject) => {
    const controller = new AbortController();
    let res;
    const timeout = setTimeout(() => {
        if (!res)
            controller.abort();
        clearTimeout(timeout);
    }, 30000);
    timeout.unref();
    res = await fetch(args.sitemap || ('http://' + args.url + '/sitemap.xml'), {
        ...options,
        signal: controller.signal
    }).catch(err => console.error(args.url, err.name, err.message));
    clearTimeout(timeout);
    let outcome;
    if (res) {
        let items = 0, pdfs = 0;
        if (res.status < 300) {
            const sitemap = await res.text();
            let index = sitemap.indexOf('<url>');
            while (index != -1) {
                index = sitemap.indexOf('<url>', index + 1);
                items++;
            }
            index = sitemap.indexOf('.pdf');
            while (index != -1) {
                index = sitemap.indexOf('.pdf', index + 1);
                pdfs++;
            }
        }
        outcome = { url: args.url, name: args.name, status: res.status, redirect: res.url, xml: res.url.includes('.xml') && res.status < 300 && res.headers.has('content-type') && res.headers.get('content-type').includes('xml'), items, pdfs };
    }
    else
        outcome = { url: args.url, name: args.name, status: 500, redirect: null, xml: false, items: 0, pdfs: 0 };
    outcomes.push(outcome);

    done++;
    console.log(args.url, outcome.status, outcome.redirect, outcome.xml, Math.round(100 * done / domains.length) + '%', `${(Math.floor((Date.now() - start) / 1000 / 60)).toString().padStart(2, '0')}:${(Math.floor((Date.now() - start) / 1000) % 60).toString().padStart(2, '0')}`);

    resolve();
}), 5, 750);

writeFileSync('data/sitemap.json', JSON.stringify(outcomes));
let csv = 'domain,agency,status,redirect,xml,items,pdfs\n';
for (const outcome of outcomes)
    csv += outcome.url + ',' + outcome.name + ',' + outcome.status + ',' + outcome.redirect + ',' + outcome.xml + ',' + outcome.items + ',' + outcome.pdfs + '\n';
writeFileSync('data/sitemap.csv', csv);
console.log('Done writing');

exit();