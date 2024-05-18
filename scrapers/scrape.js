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

export const domains = readFileSync('data/domains.csv', 'utf8').replaceAll('\r', '').split('\n').slice(1)
    .filter(d => d.includes(','));

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