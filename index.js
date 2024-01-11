const { writeFileSync } = require('fs');

const properties = ['<title', 'name="description"', 'name="keywords"', 'name="robots"', 'name="viewport"', 'rel="canonical"',
    'name="og:locale"', 'name="og:site_name"', 'name="og:type"', 'name="og:title"', 'name="og:description"', 'name="og:url"',
    'name="og:image"', 'name="og:image:width"', 'name="og:image:height"', 'name="og:image:alt"', 'name="twitter:site"', 'name="twitter:card"',
    'name="twitter:title"', 'name="twitter:description"', 'name="twitter:image"'];
const variables = properties.map(property => {
    if (property.includes('"'))
        property = property.substring(property.indexOf('"') + 1, property.lastIndexOf('"'));
    else
        property = property.substring(property.indexOf('<') + 1);
    return property.replaceAll(/(?:\:|_)([a-z])/g, match => match[1].toUpperCase());
});
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