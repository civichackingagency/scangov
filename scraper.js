import { writeFileSync, readFileSync } from 'fs';
import pThrottle from 'p-throttle';
import fetch from 'node-fetch';

const start = Date.now();

let properties = ['<title', 'name="description"', 'name="keywords"', 'name="robots"', 'name="viewport"', 'rel="canonical"',
    'property="og:locale"', 'property="og:site_name"', 'property="og:type"', 'property="og:title"', 'property="og:description"', 'property="og:url"',
    'property="og:image"', 'property="og:image:width"', 'property="og:image:height"', 'property="og:image:alt"', 'name="twitter:site"', 'name="twitter:card"',
    'name="twitter:title"', 'name="twitter:description"', 'name="twitter:image"'];
const variables = properties.map(property => {
    if (property.includes('"'))
        property = property.substring(property.indexOf('"') + 1, property.lastIndexOf('"'));
    else
        property = property.substring(property.indexOf('<') + 1);
    return property.replaceAll(/(?:\:|_)([a-z])/g, match => match[1].toUpperCase());
});
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

let csv = 'Domain,Redirect,Agency,Status,' + csvVariables.join(',') + '\n';
properties = properties.map(property => { return { string: property, regex: new RegExp(property.replaceAll('"', '("|)'), 'm') } });

let historyData = readFileSync('data.json', 'utf8');
historyData = historyData.includes('[') ? JSON.parse(historyData) : [];
const outcomes = [];
const errors = [];

const capitalizeFirstLetters = str => {
    let string = str.toLowerCase();
    if (string.length > 0)
        string = string[0].toUpperCase() + string.substring(1);
    for (let i = 0; i < string.length; i++)
        if (string[i + 1] && string[i] == ' ' || string[i] == '-' || string[i] == '.' && string[i + 1])
            string = string.substring(0, i + 1) + string[i + 1].toUpperCase() + string.substring(i + 2);
    return string;
};

let done = 0;
const fetchPromise = agency => {
    return new Promise(async (resolve, reject) => {
        const agencyData = agency.split(',');
        agencyData[0] = agencyData[0].toLowerCase();
        const controller = new AbortController();
        const signal = controller.signal;
        const timeout = setTimeout(() => {
            console.error('Aborting', agencyData[0]);
            clearTimeout(timeout);
            controller.abort();
            reject('Timeout');
        }, 30000);
        const options = {
            method: 'GET',
            signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*\/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
            }
        };
        fetch('http://' + agencyData[0], options).then(async res => {
            let data = await res.text();
            data = data.replaceAll('\'', '"').toLowerCase();
            let url;

            const checkForRefresh = async html => {
                if (html.includes('http-equiv="refresh"')) {
                    let index = html.indexOf('http-equiv="refresh"');
                    index = html.indexOf('url=', index) + 4;
                    let redirectUrl = html.substring(index);
                    if (redirectUrl.startsWith('"'))
                        redirectUrl = redirectUrl.substring(1);
                    redirectUrl = redirectUrl.substring(0, redirectUrl.indexOf('"'));
                    if (!redirectUrl.startsWith('//') && redirectUrl.startsWith('/'))
                        redirectUrl = (url || ('http://' + agencyData[0])) + redirectUrl;
                    url = redirectUrl;

                    data = (await (await fetch(redirectUrl)).text()).replaceAll('\'', '"').toLowerCase();
                    await checkForRefresh(data);
                }
            }
            await checkForRefresh(data);

            const past = historyData.find(h => h.url == agencyData[0]);
            let history = (past && past.history) ? past.history : [];
            let oldData = { time: Date.now(), status: past ? past.status : null, /*sitemap: past ? past.sitemap : null,*/ dotgov: past ? past.dotgov : null, https: past ? past.https : null };
            if (past)
                for (let i = 0; i < variables.length; i++)
                    oldData[variables[i]] = past[variables[i]];
            let changed = false;
            const redirect = url || res.url;
            let tld = redirect.substring(redirect.indexOf('//') + 2);
            tld = tld.substring(0, tld.indexOf('/'));
            tld = tld.substring(tld.lastIndexOf('.') + 1);
            const baseUrl = redirect.substring(0, redirect.indexOf('/', redirect.indexOf('//') + 2));

            //const sitemapReq = await fetch(baseUrl + '/sitemap.xml', options);
            //const sitemap = res.status < 300 && sitemapReq.status < 300 && sitemapReq.url.includes('sitemap.xml');
            const outcome = {
                status: res.status,
                url: agencyData[0],
                name: capitalizeFirstLetters(agencyData[2]),
                redirect,
                dotgov: tld == 'gov',
                https: res.url.startsWith('https://'),
                //sitemap
            };
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

            if (changed && past)
                history.push(oldData);
            outcome.history = history;
            outcomes.push(outcome);
        }).catch(err => {
            const outcome = { status: (err.name === 'AbortError' ? 408 : 500), url: agencyData[0], name: capitalizeFirstLetters(agencyData[2]) };
            for (let i = 0; i < properties.length; i++)
                outcome[variables[i]] = false;
            outcomes.push(outcome);

            try {
                errors.push({ agencyData, error: err.name + ': ' + err.message });
                writeFileSync('errors.json', JSON.stringify(errors));
            }
            catch (err) {
                errors.pop();
            }

            console.error(agencyData[0], err);
        }).finally(() => {
            clearTimeout(timeout);

            writeFileSync('data.json', JSON.stringify(outcomes));

            done++;
            console.log(`Done with ${agencyData[0]} ${done}/${agencies.length} ${Math.round(done / agencies.length * 100)}% in ${(Math.round((Date.now() - start) / 1000 / 60)).toString().padStart(2, '0')}:${(Math.round((Date.now() - start) / 1000) % 60).toString().padStart(2, '0')}`);

            resolve();
        });
    })
};

const throttleFetch = pThrottle({
    limit: 5,
    interval: 1000
})(fetchPromise);

// https://github.com/cisagov/dotgov-data/blob/main/current-federal.csv
const data = readFileSync('current-federal.csv', 'utf8');
let agencies = data.split('\n');
agencies.shift();
agencies = [
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
    'TX.GOV,,State of Texas,,',
    'UTAH.GOV,,State of Utah,,',
    'VERMONT.GOV,,State of Vermont,,',
    'VIRGINIA.GOV,,State of Virginia,,',
    'WA.GOV,,State of Washington,,',
    'WV.GOV,,State of West Virginia,,',
    'WISCONSIN.GOV,,State of Wisconsin,,',
    'WYO.GOV,,State of Wyoming,,'
].concat(agencies);
// https://github.com/GSA/govt-urls/blob/main/2_govt_urls_federal_only.csv
let nonDotGov = readFileSync('non-dotgov.csv', 'utf8').split('\n').filter(d => d.split(',')[4] == 'Federal');
nonDotGov.shift();
nonDotGov = nonDotGov.map(a => {
    const domain = a.split(',');
    return domain[0] + ',,' + domain[1] || 'undefined' + ',,,,';
});
agencies = agencies.concat(nonDotGov);
agencies = agencies.filter(a => {
    const agencyData = a.split(',');
    return !(agencyData.length < 3 || agencyData[0].length == 0 || agencyData[2] === 'National Archives and Records Administration');
});

const promises = [];
for (let i = 0; i < agencies.length; i++)
    promises.push(throttleFetch(agencies[i]).catch(err => {
        console.error(err);
    }));

await Promise.all(promises);
console.log('Done fetching');

const jsonData = JSON.parse(readFileSync('data.json', 'utf8'));
for (const agency of jsonData) {
    csv += agency.url + ',' + agency.redirect + ',' + agency.name + ',' + agency.status;
    for (let i = 0; i < variables.length; i++)
        csv += ',' + agency[variables[i]];
    csv += '\n';
}
writeFileSync('data.csv', csv);

const errorData = JSON.parse(readFileSync('errors.json', 'utf8'));
let errorCsv = 'Domain,Error,Email\n';
for (const error of errorData)
    errorCsv += error.agencyData[0] + ',"' + error.error.replaceAll('\n', ' ') + '",' + error.agencyData[6] + '\n';
writeFileSync('errors.csv', errorCsv);