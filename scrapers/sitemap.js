import { readFileSync, writeFileSync } from 'fs';
import { exit } from 'process';

const queue = [];
let domains = readFileSync('data/current-federal.csv', 'utf8').split('\n');
domains.shift();
domains = [
    'ALABAMA.GOV,,State of Alabama,,',
    'ALASKA.GOV,,State of Alaska,,',
    'AZ.GOV,,State of Arizona,,',
    'ARKANSAS.GOV,,State of Arkansas,,',
    'CA.GOV,,State of California,,',
    'COLORADO.GOV,,State of Colorado,,',
    'CT.GOV,,State of Connecticut,,',
    'DE.GOV,,State of Delaware,,',
    'MYFLORIDA.COM,,State of Florida,,',
    'GEORGIA.GOV,,State of Georgia,,',
    'HAWAII.GOV,,State of Hawaii,,',
    'IDAHO.GOV,,State of Idaho,,',
    'ILLINOIS.GOV,,State of Illinois,,',
    'IN.GOV,,State of Indiana,,',
    'IOWA.GOV,,State of Iowa,,',
    'KANSAS.GOV,,State of Kansas,,',
    'KENTUCKY.GOV,,State of Kentucky,,',
    'LOIUSIANA.GOV,,State of Louisiana,,',
    'MAINE.GOV,,State of Maine,,',
    'MARYLAND.GOV,,State of Maryland,,',
    'MASS.GOV,,State of Massachusett,,',
    'MICHIGAN.GOV,,State of Michigan,,',
    'MN.GOV,,State of Minnesota,,',
    'MISSISSIPPI.GOV,,State of Mississippi,,',
    'MO.GOV,,State of Missouri,,',
    'MT.GOV,,State of Montana,,',
    'NEBRASKA.GOV,,State of Nebraska,,',
    'NV.GOV,,State of Nevada,,',
    'NH.GOV,,State of New Hampshire,,',
    'NJ.GOV,,State of New Jersey,,',
    'NM.GOV,,State of New Mexico,,',
    'NY.GOV,,State of New York,,',
    'NC.GOV,,State of North Carolina,,',
    'ND.GOV,,State of North Dakota,,',
    'OHIO.GOV,,State of Ohio,,',
    'OKLAHOMA.GOV,,State of Oklahoma,,',
    'OREGON.GOV,,State of Oregon,,',
    'PA.GOV,,State of Pennsylvania,,',
    'RI.GOV,,State of Rhode Island,,',
    'SC.GOV,,State of South Carolina,,',
    'SD.GOV,,State of South Dakota,,',
    'TN.GOV,,State of Tennessee,,',
    'TEXAS.GOV,,State of Texas,,',
    'UTAH.GOV,,State of Utah,,',
    'VERMONT.GOV,,State of Vermont,,',
    'VIRGINIA.GOV,,State of Virginia,,',
    'WA.GOV,,State of Washington,,',
    'WV.GOV,,State of West Virginia,,',
    'WISCONSIN.GOV,,State of Wisconsin,,',
    'WYO.GOV,,State of Wyoming,,'
].concat(domains);
// https://github.com/GSA/govt-urls/blob/main/2_govt_urls_federal_only.csv
let nonDotGov = readFileSync('data/non-dotgov.csv', 'utf8').split('\n').filter(d => d.split(',')[4] == 'Federal');
nonDotGov.shift();
nonDotGov = nonDotGov.map(a => {
    const domain = a.split(',');
    let name = domain[1] || 'undefined';
    if (name.includes(' ('))
        name = name.substring(0, name.indexOf(' ('));
    return domain[0] + ',,' + name + ',,,,';
});
domains = domains.concat(nonDotGov);
// Don't use archived sites
domains = domains.filter(a => {
    const domainData = a.split(',');
    return !(domainData.length < 3 || domainData[0].length == 0 || domainData[2] === 'National Archives and Records Administration');
});
for (let i = 0; i < domains.length; i++)
    queue.push({ url: domains[i].split(',')[0].toLowerCase(), name: domains[i].split(',')[2] });

const fetchOptions = {
    method: 'GET',
    headers: {
        'User-Agent': 'CivicHackingAgency/1.0 gov-metadata',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*\/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
    }
};

let done = 0;
const outcomes = [];
let running = 0;
const start = Date.now();
const interval = setInterval(() => {
    if (queue.length === 0) {
        clearInterval(interval);
        console.log('Queue empty, finishing in 30 seconds');
        setTimeout(() => {
            writeFileSync('data/sitemap.json', JSON.stringify(outcomes));
            console.log('Done')
            exit(0);
        }, 30000);
    }

    const current = running;
    for (let i = 0; i < 5 - current && queue.length; i++) {
        (async () => {
            running++;

            const options = queue.shift();
            const controller = new AbortController();
            let res;
            setTimeout(() => {
                if (!res)
                    controller.abort();
            }, 30000);
            res = await fetch('http://' + options.url + '/sitemap.xml', {
                ...fetchOptions,
                signal: controller.signal
            }).catch(err => console.error(options.url, err.name, err.message));
            let outcome;
            if (res) {
                const sitemap = await res.text();
                let index = sitemap.indexOf('<url>');
                let items = 0;
                while (index != -1) {
                    index = sitemap.indexOf('<url>', index + 1);
                    items++;
                }
                index = sitemap.indexOf('.pdf');
                let pdfs = 0;
                while (index != -1) {
                    index = sitemap.indexOf('.pdf', index + 1);
                    pdfs++;
                }
                outcome = { url: options.url, name: options.name, status: res.status, redirect: res.url, xml: res.url.includes('.xml') && res.status < 300 && res.headers.get('content-type').includes('xml'), items, pdfs };
            }
            else
                outcome = { url: options.url, name: options.name, status: 500, redirect: null, xml: false, items: 0, pdfs: 0 };
            outcomes.push(outcome);
            console.log(options.url, outcome.status, outcome.redirect, outcome.xml, Math.round(100 * done / domains.length) + '%', `${(Math.floor((Date.now() - start) / 1000 / 60)).toString().padStart(2, '0')}:${(Math.floor((Date.now() - start) / 1000) % 60).toString().padStart(2, '0')}`);

            done++;
            running--;
        })();
    }
}, 750);