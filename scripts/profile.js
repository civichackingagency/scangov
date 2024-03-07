const agencyURL = new URLSearchParams(location.search).get('domain');
const table = document.getElementById('table'),
    gradeCard = document.getElementById('grade-card'),
    docs = document.getElementById('docs'),
    pageTitle = document.getElementById('page');
const check = '<svg class="svg-inline--fa fa-circle-check" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="circle-check" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-fa-i2svg=""><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/></svg>',
    x = '<svg class="svg-inline--fa fa-circle-xmark" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="circle-xmark" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-fa-i2svg=""><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"/></svg>';

let metadataJson, urlJson, sitemapJson;
let metadataLoaded = false, urlLoaded = false, sitemapLoaded = false;
const successes = [], dangers = [];

const load = async page => {
    while (table.firstChild)
        table.removeChild(table.lastChild);
    if (gradeCard.classList.length === 3)
        gradeCard.classList.remove('text-bg-success', 'text-bg-warning', 'text-bg-danger');
    document.getElementById('specific').classList = '';
    document.getElementById('overview').classList = 'd-none';
    document.getElementById('amount').style.display = 'initial';
    document.getElementById('changelog').style.display = 'none';
    docs.innerHTML = '';

    if (page === '#url') {
        pageTitle.innerText = 'URL';
        if (!urlLoaded) {
            const data = await (await fetch('/data/url.json')).json();
            for (const domain of data)
                if (domain.url == agencyURL) {
                    urlJson = domain;
                    break;
                }
            urlLoaded = true;
        }

        const data = urlJson;

        document.getElementById('site').innerText = data.url;
        document.getElementById('parent').innerText = data.name;
        document.getElementById('parent').href = '/?search=' + data.name + '&agency=1';
        document.getElementById('visit-link').href = data.redirect;

        const score = (data.https + data.www + data.dotgov) / 3;
        if (data.status == 200) {
            document.getElementById('percent').innerText = Math.round(100 * score);
            document.getElementById('amount').innerText = 3 * score + ' of 3 elements';
            gradeCard.classList.add('text-bg-' + (score >= 0.9 ? 'success' : score >= 0.7 ? 'warning' : 'danger'));
            document.getElementById('grade').innerText = getGrade(score * 100);
        }
        else {
            document.getElementById('percent').innerText = '-';
            document.getElementById('amount').innerText = agencyURL + ' didn\'t respond';
            document.getElementById('grade').innerText = '-';
        }

        table.innerHTML += `
            <tr>
                <td>
                    <pre><code>HTTPS</code></pre>
                </td> 
                <td>
                    A secure data transfer protocol.    
                </td>
                <td>
                    <i class="fa-solid ${data.status !== 200 ? 'fa-circle-exclamation text-warning' : data.https ? 'fa-circle-check text-success' : 'fa-circle-xmark text-danger'}"></i> <span class="d-none d-xl-inline">${data.status !== 200 ? 'Can\'t access (' + data.status + ')' : data.https ? 'Active' : 'Missing'}</span>
                </td>
            </tr>
            <tr>
                <td>
                    <pre><code>.gov</code></pre>
                </td> 
                <td>
                    An authoritative top level domain.    
                </td>
                <td>
                    <i class="fa-solid ${data.status !== 200 ? 'fa-circle-exclamation text-warning' : data.dotgov ? 'fa-circle-check text-success' : 'fa-circle-xmark text-danger'}"></i> <span class="d-none d-xl-inline">${data.status !== 200 ? 'Can\'t access (' + data.status + ')' : data.dotgov ? 'Active' : 'Missing'}</span>
                </td>
            </tr>
            <tr>
                <td>
                    <pre><code>www</code></pre>
                </td> 
                <td>
                    www canonicalization.    
                </td>
                <td>
                    <i class="fa-solid ${data.status !== 200 ? 'fa-circle-exclamation text-warning' : data.www ? 'fa-circle-check text-success' : 'fa-circle-xmark text-danger'}"></i> <span class="d-none d-xl-inline">${data.status !== 200 ? 'Can\'t access (' + data.status + ')' : data.www ? 'Active' : 'Missing'}</span>
                </td>
            </tr>
        `;

        docs.innerHTML = `
            <li>
                <a href="/docs/data">Data</a>
            </li>
            <li>
                <a href="/docs/status">Status</a>
            </li>
            <li>
                <a href="/docs/url">URL</a>
            </li>
        `;
    }
    else if (page === '#sitemap') {
        pageTitle.innerText = 'Sitemap';
        if (!sitemapLoaded) {
            const data = await (await fetch('/data/sitemap.json')).json();
            for (const domain of data)
                if (domain.url == agencyURL) {
                    sitemapJson = domain;
                    break;
                }
            sitemapLoaded = true;
        }

        const data = sitemapJson;

        document.getElementById('site').innerText = data.url;
        document.getElementById('parent').innerText = data.name;
        document.getElementById('parent').href = '/?search=' + data.name + '&agency=1';
        document.getElementById('visit-link').href = data.redirect;

        const score = 100 * ((data.status === 200) + data.xml) / 2;
        document.getElementById('percent').innerText = Math.round(score);
        document.getElementById('amount').style.display = 'none';
        gradeCard.classList.add('text-bg-' + getColor(score));
        document.getElementById('grade').innerText = getGrade(score);

        //const pdfs = data.items > 0 ? data.pdfs / data.items : 1;
        table.innerHTML += `
            <tr>
                <td>
                    <pre><code>Status</code></pre>
                </td>
                <td>
                    The HTTP status code of /sitemap.xml.
                </td>
                <td>
                    <span class="badge d-xl-inline text-bg-${data.status < 300 ? 'success' : 'danger'}">${data.status}</span>
                </td>
            </tr>
            <tr>
                <td>
                    <pre><code>XML</code></pre>
                </td>
                <td>
                    If the file type of the sitemap is XML.
                </td>
                <td>
                    <i class="fa-solid ${data.xml ? 'fa-circle-check text-success' : 'fa-circle-xmark text-danger'}"></i> <span class="d-none d-xl-inline">${data.xml ? 'Active' : 'Missing'}</span>
                </td>
            </tr>
        `;
        /*
        <tr>
            <td>
                <pre><code>PDFs</code></pre>
            </td>
            <td>
                The percent of items that are PDF files.
            </td>
            <td>
                <span class="d-xl-inline text-bg-${pdfs <= 0.1 ? 'success' : pdfs <= 0.3 ? 'warning' : 'danger'}">${Math.round(100 * pdfs)}%</span>
            </td>
        </tr>
        `;*/

        docs.innerHTML = `
            <li>
                <a href="/docs/data">Data</a>
            </li>
            <li>
                <a href="/docs/status">Status</a>
            </li>
            <li>
                <a href="/docs/sitemap">Sitemap</a>
            </li>
        `;
    }
    else if (page === '#metadata') {
        document.getElementById('changelog').style.display = 'initial';
        pageTitle.innerText = 'Metadata';
        if (!metadataJson) {
            const data = await (await fetch('/data/metadata.json')).json();
            let currentAgency;
            for (const agency of data)
                if (agency.url == agencyURL) {
                    currentAgency = agency;
                    break;
                }
            metadataJson = currentAgency;
        }

        const data = metadataJson;

        const redirect = data.redirect && !data.redirect.includes(data.url);
        if (!metadataLoaded) {
            for (let i = 0; i < variables.length; i++)
                if (data[variables[i]] && data.status === 200 && !redirect)
                    if (properties[i].includes('"'))
                        successes.push([(!properties[i].includes('canonical') ? '&lt;meta ' : '&lt;link ') + properties[i] + '&gt;', i]);
                    else
                        successes.push([properties[i].replace('<', '&lt;') + '&gt;', i]);
                else
                    if (properties[i].includes('"'))
                        dangers.push([(!properties[i].includes('canonical') ? '&lt;meta ' : '&lt;link ') + properties[i] + '&gt;', i]);
                    else
                        dangers.push([properties[i].replace('<', '&lt;') + '&gt;', i]);

            metadataLoaded = true;
        }

        document.getElementById('site').innerText = data.url;
        document.getElementById('parent').innerText = data.name;
        document.getElementById('parent').href = '/?search=' + data.name + '&agency=1';
        document.getElementById('visit-link').href = data.redirect;
        /*const viewRedirect = document.getElementById('view-redirect');
        if (redirect) {
            let redirectDomain;
            for (let i = 0; i < listData.length; i++)
                if (data.redirect.includes(listData[i].url)) {
                    redirectDomain = listData[i].url;
                    break;
                }
            if (redirectDomain) {
                viewRedirect.href = '/profile/?domain=' + redirectDomain;
                viewRedirect.classList.remove('d-none');
            }
            else
                viewRedirect.parentElement.removeChild(viewRedirect);
        }
        else
            viewRedirect.parentElement.removeChild(viewRedirect);*/

        const percent = Math.round(successes.length / variables.length * 100);
        if (data.status == 200 && !redirect) {
            document.getElementById('percent').innerText = percent;
            document.getElementById('amount').innerText = successes.length + ' of ' + variables.length + ' tags';
            gradeCard.classList.add('text-bg-' + getColor(percent));
            document.getElementById('grade').innerText = getGrade(percent);
        }
        else {
            document.getElementById('percent').innerText = '-';
            if (data.status != 200)
                document.getElementById('amount').innerText = agencyURL + ' didn\'t respond';
            else
                document.getElementById('amount').innerText = agencyURL + ' redirected';
            document.getElementById('grade').innerText = '-';
        }

        for (const success of successes)
            table.innerHTML += `
                <tr>
                    <td>
                        <pre><code class="text-wrap">${success[0]}</code></pre>
                    </td> 
                    <td>
                        ${descriptions[success[1]]}
                    </td>
                    <td>
                        ${check} <span class="d-none d-xl-inline">Active</span>
                    </td>
                </tr>
            `;
        for (const danger of dangers)
            table.innerHTML += `
                <tr>
                    <td>
                        <pre><code>${danger[0]}</code></pre>
                    </td> 
                    <td>
                        ${descriptions[danger[1]]}    
                    </td>
                    <td>
                        <i class="fa-solid ${data.status === 200 && !redirect ? 'fa-circle-xmark text-danger' : redirect ? 'fa-circle-right text-info' : 'fa-circle-exclamation text-warning'}"></i> <span class="d-none d-xl-inline">${data.status === 200 && !redirect ? 'Missing' : redirect ? 'Redirect' : 'Can\'t access (' + data.status + ')'}</span>
                    </td>
                </tr>
            `;

        if (redirect) {
            const changelog = document.getElementById('changelog');
            changelog.parentElement.removeChild(changelog);
            return;
        }
        const timeline = document.getElementById('timeline');
        timeline.innerHTML = `
            <li class="timeline-item mb-5">
                <h5 class="fw-bold">Status: ${data.status} / Grade: ${getGrade(percent)} / Score: ${percent}% (${successes.length} of ${variables.length} tags)</h5>
                <p class="mb-1 text-muted">Current</p>
                <p>${successes.map(success => {
            let property = properties[success[1]];
            if (property.includes('"'))
                property = property.substring(property.indexOf('"') + 1, property.lastIndexOf('"'));
            else
                property = property.substring(1);
            return `<span title="${property}">${check}</span>`;
        }).join(' ')} ${dangers.map(danger => {
            let property = properties[danger[1]];
            if (property.includes('"'))
                property = property.substring(property.indexOf('"') + 1, property.lastIndexOf('"'));
            else
                property = property.substring(1);
            return `<span title="${property}">${x}</span>`;
        }).join(' ')}</p>
            </li>`;
        for (let i = data.history.length - 1; i >= 0; i--) {
            const update = data.history[i];
            let updateTotal = 0;
            for (const variable of variables)
                if (update[variable])
                    updateTotal++;
            const percent = Math.round(updateTotal / variables.length * 100);
            const date = new Date(update.time);
            const updateSuccesses = [], updateDangers = [];
            for (let j = 0; j < variables.length; j++) {
                let property = properties[j];
                if (property.includes('"'))
                    property = property.substring(property.indexOf('"') + 1, property.lastIndexOf('"'));
                else
                    property = property.substring(1);
                if (update[variables[j]])
                    updateSuccesses.push(property);
                else
                    updateDangers.push(property);
            }
            timeline.innerHTML += `
                <li class="timeline-item mb-5">
                    <h5 class="fw-bold">Status: ${update.status} / Grade: ${getGrade(percent)} / Score: ${percent}% (${updateTotal} of ${variables.length} tags)</h5>
                    <p class="mb-1 text-muted">${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}</p>
                    <p>${updateSuccesses.map(success => `<span title="${success}">${check}</span>`).join(' ')} ${updateDangers.map(danger => `<span title="${danger}">${x}</span>`).join(' ')}</p>
                </li>
            `;
        }

        docs.innerHTML = `
            <li>
                <a href="/docs/data">Data</a>
            </li>
            <li>
                <a href="/docs/grades">Grades</a>
            </li>
            <li>
                <a href="/docs/metadata">Metadata</a>
            </li>
            <li>
                <a href="/docs/scores">Scores</a>
            </li>
            <li>
                <a href="/docs/status">Status</a>
            </li>
        `;
    }
    else {
        document.getElementById('specific').classList = 'd-none';
        document.getElementById('overview').classList = '';
        pageTitle.innerText = 'Overview';

        const metadataCard = document.getElementById('metadata-card');
        if (metadataCard.classList.length > 2)
            return;

        const showMetadata = () => {
            let total = 0;
            for (const variable of variables)
                if (metadataJson[variable])
                    total++;
            document.getElementById('metadata').innerText = getGrade(total / variables.length * 100);
            metadataCard.classList.add('text-bg-' + getColor(Math.round(total / variables.length * 100)));
        };
        if (!metadataJson)
            fetch('/data/metadata.json').then(res => res.json()).then(data => {
                let currentDomain;
                for (const domain of data)
                    if (domain.url == agencyURL) {
                        currentDomain = domain;
                        break;
                    }
                metadataJson = currentDomain;
                showMetadata();
            });
        else
            showMetadata();

        const showUrl = () => {
            document.getElementById('url').innerText = getGrade(100 * (urlJson.https + urlJson.www + urlJson.dotgov) / 3);
            document.getElementById('url-card').classList.add('text-bg-' + getColor(Math.round(100 * (urlJson.https + urlJson.www + urlJson.dotgov) / 3)));
        };
        if (!urlLoaded)
            fetch('/data/url.json').then(res => res.json()).then(data => {
                let currentDomain;
                for (const domain of data)
                    if (domain.url == agencyURL) {
                        currentDomain = domain;
                        break;
                    }
                urlJson = currentDomain;
                urlLoaded = true;
                showUrl();
            });
        else
            showUrl();

        const showSitemap = () => {
            document.getElementById('site').innerText = sitemapJson.url;
            document.getElementById('parent').innerText = sitemapJson.name;

            const percent = Math.round(100 * ((sitemapJson.status === 200) + sitemapJson.xml) / 2);
            document.getElementById('sitemap').innerText = getGrade(percent);
            document.getElementById('sitemap-card').classList.add('text-bg-' + getColor(percent));
        };
        if (!sitemapLoaded)
            fetch('/data/sitemap.json').then(res => res.json()).then(data => {
                let currentDomain;
                for (const domain of data)
                    if (domain.url == agencyURL) {
                        currentDomain = domain;
                        break;
                    }
                sitemapJson = currentDomain;
                sitemapLoaded = true;
                showSitemap();
            });
        else
            showSitemap();
    }
};

load(location.hash);

onhashchange = () => {
    load(location.hash);
};