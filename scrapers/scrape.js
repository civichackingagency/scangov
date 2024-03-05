import { writeFileSync, readFileSync } from 'fs';
import pThrottle from 'p-throttle';

const start = Date.now();

export const options = {
    method: 'GET',
    headers: {
        'User-Agent': 'CivicHackingAgency/1.0 gov-metadata',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*\/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
    }
};

export const capitalizeFirstLetters = str => {
    let string = str.toLowerCase();
    if (string.length > 0)
        string = string[0].toUpperCase() + string.substring(1);
    for (let i = 0; i < string.length; i++)
        if (string[i + 1] && (string[i] == ' ' || string[i] == '-' || string[i] == '.') && string[i + 1])
            string = string.substring(0, i + 1) + string[i + 1].toUpperCase() + string.substring(i + 2);
    return string;
};


// https://github.com/cisagov/dotgov-data/blob/main/current-federal.csv
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

export const scrape = (callback, domain = undefined) => {
    const fetchPromise = domainData => new Promise((resolve, reject) => {
        domainData[0] = domainData[0].toLowerCase();
        callback(domainData, resolve, reject);
    });

    const throttleFetch = pThrottle({
        limit: 5,
        interval: 1000
    })(fetchPromise);

    const promises = [];
    for (let i = 0; i < domains.length; i++) {
        const name = domains[i].split(',')[0].toLowerCase();
        // Check if only scraping one site
        if (!domain || (domain && domain == name))
            promises.push(throttleFetch(domains[i].split(',')).catch(err => console.error(err)));
        // Only update the selected domain
        /*else {
            let agencyData;
            for (let j = 0; j < historyData.length; j++)
                if (historyData[j].url == name) {
                    agencyData = historyData[j];
                    break;
                }
            if (agencyData)
                outcomes.push(agencyData);
        }*/
    }

    return Promise.all(promises);
};