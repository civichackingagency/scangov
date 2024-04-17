import { readFileSync } from 'fs';

export const options = {
    method: 'GET',
    headers: {
        'User-Agent': 'CivicHackingAgency/1.0 ScanGov',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*\/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
    }
};

// To run your own, domains, delete everything until the export statement
// https://github.com/cisagov/dotgov-data/blob/main/current-federal.csv
let domainsList = readFileSync('data/current-federal.csv', 'utf8').split('\n');
domainsList.shift();
domainsList = [
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
    'LOUISIANA.GOV,,State of Louisiana,,',
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
].concat(domainsList);
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
domainsList = domainsList.concat(nonDotGov);
// Don't use archived sites
domainsList = domainsList.filter(a => {
    const domainData = a.split(',');
    return !(domainData.length < 3 || domainData[0].length == 0 || domainData[2] === 'National Archives and Records Administration');
});
// To run your own domains, create domainsList here
export const domains = domainsList;

/**
 * 
 * @param {Array<{url: string, name: string}>} queue 
 * @param {Promise} callback 
 * @param {number} instances 
 * @param {number} interval 
 */
export const scrape = (queue, callback, instances, interval) => {
    const runningArray = [];
    return new Promise((resolve, reject) => {
        let running = 0;
        const loop = setInterval(() => {
            if (queue.length === 0 && running === 0) {
                clearInterval(loop);
                resolve();
            }

            const current = running;
            for (let i = 0; i < (instances - current) && queue.length; i++) {
                running++;
                const args = queue.shift();
                runningArray.push(args);
                callback(args).then(() => {
                    running--;
                    runningArray.splice(runningArray.indexOf(args), 1);
                });
            }
        }, interval);
    });
};