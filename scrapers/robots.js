import { existsSync, readFileSync, writeFileSync } from 'fs';
import fetch from 'node-fetch';
import { scrape, options, domains } from './scrape.js';
import { exit } from 'process';

const userAgent = options.headers['User-Agent'];

const outcomes = [];
const historyData = existsSync('data/robots.json') ? JSON.parse(readFileSync('data/robots.json', 'utf8')) : [];
const urls = JSON.parse(readFileSync('data/url.json', 'utf8'));
const queue = [];
const specificDomain = process.argv[2];
for (let i = 0; i < domains.length; i++) {
    const domainData = domains[i];
    const comma = domainData.indexOf(',');
    const url = domainData.substring(0, comma).toLowerCase();
    if (!specificDomain || (specificDomain && specificDomain === url)) {
        let home = urls.find(u => u.url === url).redirect;
        if (home) {
            home = home.substring(home.indexOf('//') + 2);
            home = home.substring(home.indexOf('/'));
        }
        else
            home = '/'
        queue.push({ url, name: domainData.substring(comma + 1).replaceAll('"', ''), home });
    }
    else
        outcomes.push(historyData.find(d => d.url === url.toLowerCase()));
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
    res = await fetch('http://' + args.url + '/robots.txt', {
        ...options,
        signal: controller.signal
    }).catch(err => console.error(args.url, err.name, err.message));
    clearTimeout(timeout);
    const valid = !!(res && res.status < 300 && res.url.endsWith('/robots.txt') && res.headers.has('content-type') && res.headers.get('content-type').includes('text/plain'));
    let outcome = {
        status: res ? res.status : 500, url: args.url, name: args.name, redirect: res ? res.url : null,
        valid,
        sitemap: null,
        allowed: valid
    };
    let readingAllows = false;
    if (valid) {
        const data = (await res.text()).split('\n');
        for (let i = 0; i < data.length; i++) {
            const line = data[i].trim();
            if (!outcome.sitemap && line.startsWith('Sitemap:')) {
                let sitemap = line.substring(8).trimStart();
                if (sitemap.startsWith('/'))
                    sitemap = res.url.substring(0, res.url.indexOf(':')) + '://' + args.url + sitemap;
                outcome.sitemap = sitemap;
            }
            else if (line.startsWith('User-agent:')) {
                const agent = line.substring(11).trimStart();
                if (agent === '*' || agent === userAgent || agent === 'Googlebot' || agent == 'Bingbot')
                    readingAllows = true;
            }
            else if (readingAllows) {
                if (line.startsWith('Disallow:')) {
                    const path = line.substring(9).trimStart().replaceAll('*', '.*');
                    if (path.length === 0)
                        outcome.allowed = true;
                    else if (new RegExp(path, 'g').test(args.home))
                        outcome.allowed = false;
                }
                else if (!line.includes('llow:'))
                    readingAllows = false;
            }
        }
    }

    outcomes.push(outcome);

    done++;
    console.log(args.url, outcome.status, outcome.redirect, outcome.valid, !!outcome.sitemap, outcome.allowed, Math.round(100 * done / domains.length) + '%', `${(Math.floor((Date.now() - start) / 1000 / 60)).toString().padStart(2, '0')}:${(Math.floor((Date.now() - start) / 1000) % 60).toString().padStart(2, '0')}`);

    resolve();
}), 5, 750);

writeFileSync('data/robots.json', JSON.stringify(outcomes));
let csv = 'domain,agency,status,redirect,valid,sitemap,allowed\n';
for (const outcome of outcomes)
    csv += outcome.url + ',"' + outcome.name + '",' + outcome.status + ',"' + outcome.redirect + '",' + outcome.valid + ',"' + outcome.sitemap + '",' + outcome.allowed + '\n';
writeFileSync('data/robots.csv', csv);
console.log('Done writing');

exit();