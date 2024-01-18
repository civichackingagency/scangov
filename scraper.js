import { writeFileSync } from 'fs';
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
});;
properties = properties.map(property => new RegExp(property.replaceAll('"', '("|)'), 'gm'));

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
        fetch('http://' + agencyData[0], { method: 'GET', signal }).then(async res => {
            let data = await res.text();
            data = data.replaceAll('\'', '"');

            const outcome = { status: res.status, url: agencyData[0], name: capitalizeFirstLetters(agencyData[2]) };
            for (let i = 0; i < properties.length; i++)
                if (res.status == 200)
                    outcome[variables[i]] = !!data.match(properties[i]);
                else
                    outcome[variables[i]] = false;
            outcomes.push(outcome);
        }).catch(err => {
            const outcome = { status: (err.name === 'AbortError' ? 408 : 500), url: agencyData[0], name: capitalizeFirstLetters(agencyData[2]) };
            for (let i = 0; i < properties.length; i++)
                outcome[variables[i]] = false;
            outcomes.push(outcome);

            try {
                errors.push({ agencyData, cause: err.cause });
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
for (const agency of agencies)
    promises.push(throttleFetch(agency));
