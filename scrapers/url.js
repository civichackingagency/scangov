import { existsSync, readFileSync, writeFileSync } from 'fs';
import fetch from 'node-fetch';
import { scrape, options, domains } from './scrape.js';
import { exit } from 'process';

const CHECK_WWW = true;

const outcomes = [];
const historyData = existsSync('data/url.json') ? JSON.parse(readFileSync('data/url.json', 'utf8')) : [];
const queue = [];
const specificDomain = process.argv[2];
for (let i = 0; i < domains.length; i++) {
    const domainData = domains[i];
    const comma = domainData.indexOf(',');
    if (!specificDomain || specificDomain === domainData[0].toLowerCase())
        queue.push({ url: domainData.substring(0, comma).toLowerCase(), name: domainData.substring(comma + 1).replaceAll('"', '') });
    else
        outcomes.push(historyData.find(d => d.url === domainData.substring(0, comma).toLowerCase()));
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
    const promises = [
        fetch('http://' + args.url, {
            ...options,
            signal: controller.signal
        }).catch(err => console.error(args.url, err.name, err.message))
    ];
    if (CHECK_WWW)
        promises.push(fetch('http://www.' + args.url, {
            ...options,
            signal: controller.signal
        }).catch(err => console.error(args.url, err.name, err.message)));
    let responses = await Promise.all(promises).catch(err => console.error(args.url, err.name, err.message));
    if (!responses)
        responses = [null, null];
    res = responses[0] || responses[1];
    let url;
    if (res) {
        try {
            if (res.status < 300) {
                const text = await res.text();
                const checkForRefresh = async (html, recursions) => {
                    if (recursions >= 5)
                        return;

                    else if (html.includes('http-equiv="refresh"')) {
                        let index = html.indexOf('http-equiv="refresh"');
                        index = html.indexOf('url=', index) + 4;
                        let redirectUrl = html.substring(index);
                        if (redirectUrl.startsWith('"'))
                            redirectUrl = redirectUrl.substring(1);
                        redirectUrl = redirectUrl.substring(0, redirectUrl.indexOf('"'));
                        if (!redirectUrl.startsWith('//') && redirectUrl.startsWith('/'))
                            redirectUrl = (url || ('http://' + args.url)) + redirectUrl;

                        try {
                            data = (await (await fetch(redirectUrl)).text()).replaceAll('\'', '"').toLowerCase();
                            url = redirectUrl;
                        } catch { return; }
                        recursions++;
                        await checkForRefresh(data, recursions);
                    }
                }
                await checkForRefresh(text);
            }
        } catch (e) {
            console.error(e);
        }
    }
    if (!url && res)
        url = res.url;
    const outcome = {
        url: args.url,
        name: args.name,
        status: (res && res.status) || 500,
        redirect: url,
        https: !!(url && url.startsWith('https://')),
        dotgov: !!(url && (url.includes('.gov') || url.includes('.mil') || url.includes('.edu'))),
    };
    if (CHECK_WWW)
        outcome.www = !!(responses[0] && responses[1] && responses[0].status === responses[1].status && responses[0].url === responses[1].url)
    outcomes.push(outcome);
    done++;
    const now = Date.now();
    console.log(args.url, outcome.status, outcome.redirect, Math.round(100 * done / domains.length) + '%', `${(Math.floor((now - start) / 1000 / 60)).toString().padStart(2, '0')}:${(Math.floor((now - start) / 1000) % 60).toString().padStart(2, '0')}`);

    resolve();
}), 5, 750);

writeFileSync('data/url.json', JSON.stringify(outcomes));
let csv = 'domain,agency,status,redirect,https,dot_gov' + (CHECK_WWW ? ',www' : '') + '\n';
for (const outcome of outcomes)
    csv += outcome.url + ',"' + outcome.name + '",' + outcome.status + ',"' + outcome.redirect + '",' + outcome.https + ',' + outcome.dotgov + (CHECK_WWW ? ',' + outcome.www : '') + '\n';
writeFileSync('data/url.csv', csv);
console.log('Done writing');

exit();