import { metaDataVariables, robotsDataVariables, sitemapDataVariables, SITEMAP_COMPLETION_THRESHOLD, securityDataVariables, urlDataVariables, performanceDataVariables } from './variables.js';
import { readFileSync } from 'fs'

const metaData = JSON.parse(readFileSync('./public/data/metadata.json'));
const robotsData = JSON.parse(readFileSync('./public/data/robots.json'));
const securityData = JSON.parse(readFileSync('./public/data/security.json'));
const sitemapData = JSON.parse(readFileSync('./public/data/sitemap.json'));
const urlData = JSON.parse(readFileSync('./public/data/url.json'));
const performanceData = JSON.parse(readFileSync('./public/data/performance.json'));

const createDateNumber = time => {
    const date = new Date(time);
    // Shift year 4 digits, month 2
    // YYYYMMDD
    return (date.getFullYear() * 100 + (date.getMonth() + 1)) * 100 + date.getDate();
}

const datesMap = new Map();
const updateMap = (data, variables, name) => {
    console.log('updateMap', name)
    data.forEach(d => {
        if (d.history.length === 0)
            return;

        // Add current scores to history
        d.history.push(d);

        for (let i = 0; i < d.history.length - 1; i++) {
            const current = d.history[i], next = d.history[i + 1];

            // Calculate history scores
            let oldScore = 0, newScore = 0;
            let oldTotal = 0, newTotal = 0;
            for (let j = 0; j < variables.length; j++) {
                const variable = variables[j];
                if (name === 'Sitemap') {
                    oldTotal = 3, newTotal = 3;
                    switch (variable) {
                        case 'status':
                            oldScore += current.status === 200;
                            newScore += next.status === 200;
                            break;
                        case 'xml':
                            oldScore += current.xml;
                            newScore += next.xml;
                            break;
                        case 'completion':
                            oldScore += current.completion >= SITEMAP_COMPLETION_THRESHOLD;
                            newScore += next.completion >= SITEMAP_COMPLETION_THRESHOLD;
                            break;
                    }
                }
                else {
                    const currentHasVariable = variable in current;
                    oldScore += currentHasVariable && !!current[variable];
                    oldTotal += currentHasVariable;
                    const nextHasVariable = variable in next;
                    newScore += nextHasVariable && !!next[variable];
                    newTotal += nextHasVariable;
                }
            }

            // Score didn't change, skip
            if (oldScore === newScore)
                continue;

            const dateNumber = createDateNumber(current.time);

            if (!datesMap.has(dateNumber))
                datesMap.set(dateNumber, new Map());

            // Create array for change items
            const date = datesMap.get(dateNumber);
            if (!date.has(d.url))
                date.set(d.url, []);

            date.get(d.url).push({ name, oldScore, newScore, oldTotal, newTotal });
        }
    });
};

export default function () {
    console.log('history.js default call')
    updateMap(metaData, metaDataVariables, 'Metadata')
    updateMap(urlData, urlDataVariables, 'URL')
    updateMap(sitemapData, sitemapDataVariables, 'Sitemap')
    updateMap(robotsData, robotsDataVariables, 'Robots')
    updateMap(securityData, securityDataVariables, 'Security')
    updateMap(performanceData, performanceDataVariables, 'Performance')

    const changelog = [];
    datesMap.forEach((changes, date) => {
        const time = date;
        // Take out first two digits
        const day = date % 100;
        date = (date - day) / 100;
        // Take out next two digits
        const month = date % 100;
        date = (date - month) / 100;
        // The date variable only holds the year now
        changelog.push({
            time,
            date: month + '/' + day + '/' + date,
            domains: [...changes.entries()].sort((a, b) => a[0].localeCompare(b[0]))
        });
    });
    return changelog.sort((a, b) => b.time - a.time);
};
