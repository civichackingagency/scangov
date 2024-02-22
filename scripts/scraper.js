import { writeFileSync, readFileSync } from 'fs';
import pThrottle from 'p-throttle';
import fetch from 'node-fetch';
import { exit } from 'process';

const start = Date.now();

// Tags to search for
const properties = ['<title', '(<main)|(role="main")', 'name="description"', 'name="keywords"', 'name="robots"', 'name="viewport"', 'rel="canonical"',
    'property="og:locale"', 'property="og:site_name"', 'property="og:type"', 'property="og:title"', 'property="og:description"', 'property="og:url"',
    'property="og:image"', 'property="og:image:width"', 'property="og:image:height"', 'property="og:image:alt"',
    'dcterms.keywords', 'dc.subject', 'dcterms.subject', 'dcterms.audience', 'dc.type', 'dcterms.type', 'dc.date', 'dc.date.created', 'dcterms.created',
    'name="article:section', 'name="article:tag', 'name="article:published_time', 'name="article:modified_time',
    'name="twitter:site"', 'name="twitter:card"', 'name="twitter:title"', 'name="twitter:description"', 'name="twitter:image"']
    // Regular expressions for tags
    .map(property => { return { string: property, regex: new RegExp(property.replaceAll('"', '("|)').replaceAll('.', '\\.'), 'm') } });
// Their names in the code
const variables = [
    'title',
    'main',
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
    'dctermsKeywords',
    'dcSubject',
    'dctermsSubject',
    'dctermsAudience',
    'dcType',
    'dctermsType',
    'dcDate',
    'dcDateCreated',
    'dctermsCreated',
    'articleSection',
    'articleTag',
    'articleSection',
    'articleTag',
    'articlePublishedTime',
    'articleModifiedTime',
    'twitterSite',
    'twitterCard',
    'twitterTitle',
    'twitterDescription',
    'twitterImage'
];
const csvVariables = [
    'Title',
    'Main',
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
    'DC Terms Keywords',
    'DC Subject',
    'DC Terms Subject',
    'DC Terms Audience',
    'DC Type',
    'DC Terms Type',
    'DC Date',
    'DC Date Created',
    'DC Terms Created',
    'Article Section',
    'Article Tag',
    'Article Published Time',
    'Article Modified Time',
    'Twitter Site',
    'Twitter Card',
    'Twitter Title',
    'Twitter Description',
    'Twitter Image'
];

// Initialize data
let historyData = readFileSync('data/data.json', 'utf8');
historyData = historyData.includes('[') ? JSON.parse(historyData) : [];
const outcomes = [];
const errors = [];

const capitalizeFirstLetters = str => {
    let string = str.toLowerCase();
    if (string.length > 0)
        string = string[0].toUpperCase() + string.substring(1);
    for (let i = 0; i < string.length; i++)
        if (string[i + 1] && (string[i] == ' ' || string[i] == '-' || string[i] == '.') && string[i + 1])
            string = string.substring(0, i + 1) + string[i + 1].toUpperCase() + string.substring(i + 2);
    return string;
};

let done = 0;
const fetchPromise = agency => {
    return new Promise(async (resolve, reject) => {
        // Parse CSV
        const agencyData = agency.split(',');
        agencyData[0] = agencyData[0].toLowerCase();

        // Timeout requests
        let controller = new AbortController();
        const timeout = setTimeout(() => {
            console.error('Aborting', agencyData[0]);
            clearTimeout(timeout);
            controller.abort();
            reject('Timeout');
        }, 60000);
        const options = {
            method: 'GET',
            signal: controller.signal,
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
        const final = () => {
            outcomes.push(outcome);

            done++;
            let total = 0;
            for (let i = 0; i < variables.length; i++)
                if (outcome[variables[i]])
                    total++;
            console.log(`Done with ${agencyData[0]} (${outcome.status}, ${total}/${variables.length}) ${done}/${promises.length} ${Math.round(done / promises.length * 100)}% in ${(Math.round((Date.now() - start) / 1000 / 60)).toString().padStart(2, '0')}:${(Math.round((Date.now() - start) / 1000) % 60).toString().padStart(2, '0')}`);

            resolve();
        };
        let errorCount = 0;
        const catchError = err => {
            errorCount++;
            const status = (err.name === 'AbortError' ? 408 : 500);
            outcome = {
                status,
                url: agencyData[0],
                www: false,
                name: capitalizeFirstLetters(agencyData[2]),
                redirect: null,
                dotgov: agencyData[0].endsWith('.gov'),
                https: false,
                responseTime: Date.now() - fetchStart
            };
            const past = historyData.find(h => h.url == agencyData[0]);
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

            try {
                errors.push({ agencyData, error: err.name + ': ' + err.message });
                JSON.stringify(errors);
            }
            catch (e) {
                errors.pop();
            }

            if (errorCount == 2) {
                console.error(agencyData[0], err);
                final();
            }
        };
        const nonWww = await fetch('http://' + agencyData[0], options).catch(catchError);
        const www = await fetch('http://www.' + agencyData[0], options).catch(catchError);
        const domainPromises = [nonWww, www];
        await Promise.all(domainPromises);
        let res;
        if (nonWww && nonWww.status == 200)
            res = nonWww;
        else if (www && www.status == 200)
            res = www;
        else
            catchError({ name: 'UnknownError', message: 'Unknown error' });

        const fetchEnd = Date.now();
        let data = await res.text();
        data = data.replaceAll('\'', '"').toLowerCase();

        // Get data before update
        const past = historyData.find(h => h.url == agencyData[0]);
        let history = (past && past.history) ? past.history : [];
        let oldData = { time: Date.now(), status: past ? past.status : null, /*sitemap: past ? past.sitemap : null,*/ dotgov: past ? past.dotgov : null, https: past ? past.https : null, redirect: past ? past.redirect : null, responseTime: past ? past.responseTime : null };
        if (past)
            for (let i = 0; i < variables.length; i++)
                oldData[variables[i]] = past[variables[i]];
        let changed = false;

        const redirect = res.url;
        let tld = redirect.substring(redirect.indexOf('//') + 2);
        tld = tld.substring(0, tld.indexOf('/'));
        tld = tld.substring(tld.lastIndexOf('.') + 1);
        console.log(redirect)

        //const baseUrl = redirect.substring(0, redirect.indexOf('/', redirect.indexOf('//') + 2));
        //const sitemapReq = await fetch(baseUrl + '/sitemap.xml', options);
        //const sitemap = res.status < 300 && sitemapReq.status < 300 && sitemapReq.url.includes('sitemap.xml');

        // Initialize result
        outcome = {
            status: res.status,
            url: agencyData[0],
            www: nonWww && nonWww.status == 200 && www && www.status == 200 && nonWww.url == www.url,
            name: capitalizeFirstLetters(agencyData[2]),
            redirect,
            dotgov: tld == 'gov',
            https: res.url.startsWith('https://'),
            responseTime: fetchEnd - fetchStart
            //sitemap
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
                    redirectUrl = (url || ('http://' + agencyData[0])) + redirectUrl;
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
                if (i == 0 || i == 1) {
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

        final();
        /*}).catch(err => {
            const status = (err.name === 'AbortError' ? 408 : 500);
            outcome = { status, url: agencyData[0], name: capitalizeFirstLetters(agencyData[2]) };
            const past = historyData.find(h => h.url == agencyData[0]);
            let history = (past && past.history) ? past.history : [];
            let oldData = { time: Date.now(), status: past ? past.status : null, /*sitemap: past ? past.sitemap : null,*//* dotgov: past ? past.dotgov : null, https: past ? past.https : null, redirect: past ? past.redirect : null, responseTime: past ? past.responseTime : null };
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
errors.push({ agencyData, error: err.name + ': ' + err.message });
JSON.stringify(errors);
}
catch (err) {
errors.pop();
}

console.error(agencyData[0], err);
}).finally(() => {
clearTimeout(timeout);

done++;
let total = 0;
for (let i = 0; i < variables.length; i++)
if (outcome[variables[i]])
total++;
console.log(`Done with ${agencyData[0]} (${outcome.status}, ${total}/${variables.length}) ${done}/${promises.length} ${Math.round(done / promises.length * 100)}% in ${(Math.round((Date.now() - start) / 1000 / 60)).toString().padStart(2, '0')}:${(Math.round((Date.now() - start) / 1000) % 60).toString().padStart(2, '0')}`);

resolve();
});*/
    })
};

// Limit request speed to prevent timeouts
const throttleFetch = pThrottle({
    limit: 5,
    interval: 1000
})(fetchPromise);

// https://github.com/cisagov/dotgov-data/blob/main/current-federal.csv
const data = readFileSync('data/current-federal.csv', 'utf8');
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
let nonDotGov = readFileSync('data/non-dotgov.csv', 'utf8').split('\n').filter(d => d.split(',')[4] == 'Federal');
nonDotGov.shift();
nonDotGov = nonDotGov.map(a => {
    const domain = a.split(',');
    let name = domain[1] || 'undefined';
    if (name.includes(' ('))
        name = name.substring(0, name.indexOf(' ('));
    return domain[0] + ',,' + name + ',,,,';
});
agencies = agencies.concat(nonDotGov);
// Don't use archived sites
agencies = agencies.filter(a => {
    const agencyData = a.split(',');
    return !(agencyData.length < 3 || agencyData[0].length == 0 || agencyData[2] === 'National Archives and Records Administration');
});

const promises = [];
let domain = process.argv[2];
for (let i = 0; i < agencies.length; i++) {
    const name = agencies[i].split(',')[0].toLowerCase();
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

let csv = 'Domain,Redirect,HTTPS,.gov,www,Agency,Status,Response Time,' + csvVariables.join(',') + '\n';
for (const domain of outcomes) {
    csv += domain.url + ',' + domain.redirect + ',' + domain.https + ',' + domain.dotgov + ',' + domain.www + ',' + domain.name + ',' + domain.status + ',' + domain.responseTime;
    for (let i = 0; i < variables.length; i++)
        csv += ',' + domain[variables[i]];
    csv += '\n';
}
writeFileSync('data/data.csv', csv);

const errorData = JSON.parse(readFileSync('data/errors.json', 'utf8'));
let errorCsv = 'Domain,Error,Email\n';
for (const error of errorData)
    errorCsv += error.agencyData[0] + ',"' + error.error.replaceAll('\n', ' ') + '",' + error.agencyData[6] + '\n';
writeFileSync('data/errors.csv', errorCsv);
console.log('Done writing');
exit();