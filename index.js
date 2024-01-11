const { writeFileSync } = require('fs');
const { properties, variables } = require('./variables');

const outcomes = [];
fetch('https://www.federalregister.gov/api/v1/agencies/?api_key=' + require('./secrets').key).then(res => res.json()).then(data => {
    data = data.filter(agency => agency.agency_url);
    console.log(data.length);
    const promises = [];
    let done = 0;
    for (const agency of data)
        promises.push(fetch(agency.agency_url).then(async res => {
            done++;
            console.log(done);
            let data = await res.text();
            data = data.substring(data.indexOf('<head>'), data.indexOf('</head>'));

            const outcome = { status: res.status, url: agency.agency_url, name: agency.name };
            for (let i = 0; i < properties.length; i++)
                outcome[variables[i]] = data.includes(properties[i]);
            outcomes.push(outcome);
        }).catch(err => console.error(agency.agency_url, err)));
    Promise.all(promises).then(() => writeFileSync('data.json', JSON.stringify(outcomes)));
});