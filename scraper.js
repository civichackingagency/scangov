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

const outcomes = [];
const errors = [];

const capitalizeFirstLetters = str => {
    let string = str.toLowerCase();
    string = string[0].toUpperCase() + string.substring(1);
    for (let i = 0; i < string.length; i++)
        if (string[i] == ' ' || string[i] == '-' || string[i] == '.' && string[i + 1])
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
        const timeout = setTimeout(() => controller.abort(), 30000);
        fetch('http://' + agencyData[0], {
            method: 'GET', signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
            }
        }).then(async res => {
            let data = await res.text();
            data = data.replaceAll('\'', '"').toLowerCase();

            if (data.includes('http-equiv="refresh"')) {
                let index = data.indexOf('http-equiv="refresh"');
                index = data.indexOf('url=', index) + 4;
                let url = data.substring(index);
                if (url.startsWith('"'))
                    url = url.substring(1);
                url = url.substring(0, url.indexOf('"'));
                if (!url.startsWith('//') && url.startsWith('/'))
                    url = 'http://' + agencyData[0] + url;
                console.log(url);

                data = (await (await fetch(url)).text()).replaceAll('\'', '"').toLowerCase();
            }

            const outcome = { status: res.status, url: agencyData[0], name: capitalizeFirstLetters(agencyData[2]), redirect: res.url };
            for (let i = 0; i < properties.length; i++)
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
            console.log('Done with', agencyData[0], done + '/' + agencies.length, 'in', Math.round((Date.now() - start) / 1000 / 60 * 100) / 100, 'minutes');

            resolve();
        });
    })
};

const throttleFetch = pThrottle({
    limit: 5,
    interval: 1000
})(fetchPromise);

const data = await (await fetch('https://raw.githubusercontent.com/cisagov/dotgov-data/main/current-federal.csv')).text();
let agencies = data.split('\n');
agencies.shift();
agencies = agencies.filter(a => {
    const agencyData = a.split(',');
    return !(agencyData.length < 3 || agencyData[0].length == 0 || agencyData[2] === 'National Archives and Records Administration');
});

const promises = [];
for (let i = 0; i < agencies.length; i++)
    promises.push(throttleFetch(agencies[i]));

await Promise.all(promises);

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