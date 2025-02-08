let params = new URLSearchParams(location.search);

let field = params.get('field');
if (!(field === 'metadata' || field === 'url' || field === 'sitemap' || field === 'robots' || field === 'security'))
    field = 'overview';
document.getElementById(field + '-radio').checked = true;

const search = params.get('search') || '';

const MULTI_LEVEL = true;
let level;
if (MULTI_LEVEL) {
    level = params.get('level');
    if (!level || !(level === '1' || level === '2' || level === '3'))
        level = 1;
    else
        level = parseInt(level);
}

const filters = document.getElementById('filters');
if (search.length > 0)
    filters.innerHTML += `
    <span class="badge text-bg-primary">"${search}"</span>
`;
filters.innerHTML +=
    (MULTI_LEVEL ? `<span class="badge text-bg-primary">${level === 1 ? 'all domains' : level === 2 ? 'federal domains' : 'state domains'}</span>` : '') +
    ` <span class="badge text-bg-primary">${field}</span>`;

const agencyPage = params.get('agency') === '1';
if (!agencyPage && search.length > 0)
    document.getElementById('score-card').style.display = 'none';
const form = document.getElementById('search-form');
if (agencyPage) {
    document.getElementById('jumbotron-title').innerText = search;
    form.style.display = 'none';
    filters.style.display = 'none';
    document.getElementById('share').classList.remove('d-none');
}

const showingCount = document.getElementById('showing-count'), showingTotal = document.getElementById('showing-total');
const gradeCard = document.getElementById('grade-card'),
    gradeLabel = document.getElementById('grade'), percentLabel = document.getElementById('percent'),
    amountLabel = document.getElementById('amount');
const table = document.getElementById('table');
const pagination = document.getElementById('pagination'),
    previous = document.getElementById('previous'), previousLink = document.getElementById('previous-link'),
    next = document.getElementById('next'), nextLink = document.getElementById('next-link');
const check = '<svg class="svg-inline--fa fa-circle-check" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="circle-check" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-fa-i2svg=""><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/></svg>',
    x = '<svg class="svg-inline--fa fa-circle-xmark" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="circle-xmark" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-fa-i2svg=""><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"/></svg>';

const searchInput = document.getElementById('search');
searchInput.value = search;
let levelInput;
if (MULTI_LEVEL) {
    levelInput = document.getElementById('filter');
    levelInput.value = level;
}
const radios = document.querySelectorAll('input[type="radio"][name="field"]');
form.onsubmit = (e) => {
    e.preventDefault();
    if(searchInput.value.trim() !== '') {
        let field;
        for (const radio of radios)
            if (radio.checked) {
                field = radio.id.substring(0, radio.id.length - 6);
                break;
            }
        let href = '?field=' + field + (MULTI_LEVEL ? '&level=' + levelInput.value : '');
        if (searchInput.value.length > 0)
            href += '&search=' + searchInput.value;
        if (agencyPage && searchInput.value === search)
            href += '&agency=1';
        location.href = href;
}
}

let done = 0;
let json;
let metadataJson, urlJson, sitemapJson, robotsJson, securityJson;
const show = field => {
    if (!json || (field === 'overview' && done !== 5)) return;

    if (paginationElements.length === 0)
        showPagination(json.length);

    if (field === 'overview')
        json = json.sort((a, b) => {
            if (a.redirects && !b.redirects && b.status === 200)
                return 1;
            if (!a.redirects && a.status === 200 && b.redirects)
                return -1;

            if (a.status !== b.status)
                if (a.status === 200)
                    return -1;
                else if (b.status === 200)
                    return 1;
                else
                    return a.status - b.status;
            if (a.successes.length === b.successes.length)
                return a.url.localeCompare(b.url);
            return b.successes.length - a.successes.length;
        });

    const start = (pageNumber - 1) * 100, length = Math.min(pageNumber * 100, json.length)
    showingCount.innerText = length - start;
    showingTotal.innerText = json.length;
    for (let i = start; i < length; i++) {
        const row = document.createElement('tr');
        const domain = json[i];
        row.innerHTML = `
            <td>
                <a href="/profile/?domain=${domain.url}#${field}">${domain.url}</a>
                <br>
                <a class="small text-muted" href="?search=${domain.name}&agency=1&field=${field}">${domain.name}</a>
            </td>
            <td>
            ${(field === 'metadata' || field === 'url' || field === 'overview') && domain.status != 200 ?
                '<span title="Inaccessible (status ' + domain.status + ')"><svg class="svg-inline--fa fa-circle-exclamation" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="circle-exclamation" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-fa-i2svg=""><!--! Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2023 Fonticons, Inc. --><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c13.3 0 24 10.7 24 24V264c0 13.3-10.7 24-24 24s-24-10.7-24-24V152c0-13.3 10.7-24 24-24zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"></path></svg></span>'
                : field === 'metadata' && domain.redirects ?
                    '<span title="Redirects to ' + domain.redirect + '"><svg class="svg-inline--fa fa-circle-right" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="circle-right" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-fa-i2svg=""><!--! Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2023 Fonticons, Inc. --><path d="M0 256a256 256 0 1 0 512 0A256 256 0 1 0 0 256zM294.6 135.1l99.9 107.1c3.5 3.8 5.5 8.7 5.5 13.8s-2 10.1-5.5 13.8L294.6 376.9c-4.2 4.5-10.1 7.1-16.3 7.1C266 384 256 374 256 361.7l0-57.7-96 0c-17.7 0-32-14.3-32-32l0-32c0-17.7 14.3-32 32-32l96 0 0-57.7c0-12.3 10-22.3 22.3-22.3c6.2 0 12.1 2.6 16.3 7.1z"></path></svg></span>'
                    : domain.successes.map(success => `<span title="${success}">${check}</span>`).join('\n')}
            ${domain.successes.length > 0 ? '<br>' : ''}
            ${(field === 'metadata' || field === 'url' || field === 'overview') && (domain.status !== 200 || domain.redirects) ? '' : domain.failures.map(failure => `<span title="${failure}">${x}</span>`).join('\n')}
            </td>
            <td class="text-center">
                <span class="badge text-bg-${(field === 'metadata' || field === 'url' || field === 'overview') && (domain.status !== 200 || domain.redirects) ? 'none' : getColor(domain.score)}" title="${field === 'metadata' && (domain.status !== 200 || domain.redirects) ? '' : domain.score + '%'}">
                    ${(field === 'metadata' || field === 'url' || field === 'overview') && (domain.status !== 200 || domain.redirects) ? '-' : domain.grade}
                </span>
            </td>
`;
        table.appendChild(row);
    }
};

let pageNumber;
const tableHeader = document.getElementById('table-header');
onhashchange = start => {
    if (location.hash)
        pageNumber = parseInt(location.hash.substring(1));
    else
        pageNumber = 1;

    if (pageNumber <= 1)
        previous.classList.add('disabled');
    else {
        previous.classList.remove('disabled');
        previousLink.href = '#' + (pageNumber - 1);
    }
    if (pageNumber >= paginationElements.length)
        next.classList.add('disabled');
    else {
        next.classList.remove('disabled');
        nextLink.href = '#' + (pageNumber + 1);
    }

    if (paginationElements.length > 0) {
        for (const i of document.getElementsByClassName('active'))
            i.classList.remove('active');
        paginationElements[pageNumber - 1].classList.add('active');
    }

    while (table.firstChild)
        table.firstChild.remove();

    if (start !== true) {
        show(field);
        tableHeader.scrollIntoView();
    }
};

const paginationElements = [];
const showPagination = length => {
    length = Math.ceil(length / 100);
    for (let i = 1; i <= length; i++) {
        const li = document.createElement('li');
        li.classList.add('page-item');
        if (i === pageNumber)
            li.classList.add('active');
        li.innerHTML = `<a class="page-link" href="#${i}">${i}</a>`;
        pagination.insertBefore(li, next);
        paginationElements.push(li);
    }

    onhashchange(true);
};

const showScore = (score, elements, elementsName) => {
    if (isNaN(score))
        score = 0;
    else
        score = Math.round(100 * score);
    gradeLabel.innerText = getGrade(score);
    gradeCard.classList.add('text-bg-' + getColor(score));
    percentLabel.innerText = score;
    amountLabel.innerText = Math.round(score / 100 * elements) + ' of ' + elements + ' ' + elementsName;
};

const filterDomains = data => data.filter(domain => (domain.name.toLowerCase().includes(search.toLowerCase()) || domain.url.includes(search.toLowerCase())) && (!MULTI_LEVEL || (level === 1 || (level === 2 && !domain.name.startsWith('State of')) || level === 3 && domain.name.startsWith('State of'))));

const updateJson = (data, field) => {
    if (!json)
        json = data.map(d => {
            d.successes = d.successes.map(s => s + ' (' + field + ')');
            d.failures = d.failures.map(f => f + ' (' + field + ')');
            return d;
        });
    else
        for (let i = 0; i < data.length; i++)
            for (let j = 0; j < json.length; j++)
                if (data[i].url === json[j].url) {
                    const domain = json[j];
                    domain.successes = domain.successes.concat(data[i].successes.map(s => s + ' (' + field + ')'));
                    domain.failures = domain.failures.concat(data[i].failures.map(f => f + ' (' + field + ')'));
                    if (field === 'URL')
                        domain.status = data[i].status;
                }

    for (let i = 0; i < json.length; i++) {
        const domain = json[i];
        domain.score = Math.round(100 * domain.successes.length / (domain.successes.length + domain.failures.length));
        domain.grade = getGrade(domain.score);
        if (field === 'URL' && domain.status < 300 && domain.redirect && !domain.redirect.includes(domain.url))
            domain.redirects = true;
    }
};

const overviewScore = () => {
    let total = 0, count = 0;
    const elements = json[0].successes.length + json[0].failures.length;
    for (let i = 0; i < json.length; i++)
        if (json[i].status === 200) {
            total += json[i].successes.length;
            count++;
        }
    showScore(total / count / elements, elements, 'elements');
    show('overview');
};

if (field === 'overview' || field === 'url')
    getData('url').then(data => {
        data = filterDomains(data);

        let total = 0, count = 0;
        for (let i = 0; i < data.length; i++) {
            const domain = data[i];
            const subdomain = domain.url.split('.').length > 2;
            domain.successes = [];
            domain.failures = [];

            if (domain.status !== 200) {
                domain.failures.push('HTTPS');
                if (CHECK_WWW && !subdomain)
                    domain.failures.push('WWW');
                domain.failures.push('sTLD');
                domain.score = 0;
                domain.grade = 'F';
                continue;
            }

            domain[(domain.https ? 'successes' : 'failures')].push('HTTPS');
            if (CHECK_WWW && !subdomain)
                domain[(domain.www ? 'successes' : 'failures')].push('WWW');
            domain[(domain.dotgov ? 'successes' : 'failures')].push('sTLD');
            total += domain.successes.length;
            count++;

            domain.score = Math.round(100 * domain.successes.length / (domain.successes.length + domain.failures.length));
            domain.grade = getGrade(domain.score);
        }
        if (field === 'url') {
            data = data.sort((a, b) => {
                if (a.score === b.score)
                    return a.url.localeCompare(b.url);
                return b.score - a.score;
            });
            json = data;
        }
        else
            updateJson(data, 'URL');

        done++;
        if (field === 'url') {
            showScore(total / count / (3 - !CHECK_WWW), 3 - !CHECK_WWW, 'elements');
            show('url');
        }
        else if (done === 5)
            overviewScore();
    });
if (field === 'overview' || field === 'sitemap')
    getData('sitemap').then(data => {
        data = filterDomains(data);

        let total = 0, count = 0;
        for (let i = 0; i < data.length; i++) {
            const domain = data[i];

            domain.successes = [];
            domain.failures = [];
            (domain.status === 200 ? domain.successes : domain.failures).push('Status');
            (domain.xml ? domain.successes : domain.failures).push('XML');
            (domain.completion === 1 ? domain.successes : domain.failures).push('Complete');
            domain.score = Math.round(100 * domain.successes.length / (domain.successes.length + domain.failures.length));
            domain.grade = getGrade(domain.score);

            total += domain.successes.length;
            count++;
        }

        if (field === 'sitemap') {
            data = data.sort((a, b) => {
                if (a.score === b.score)
                    return a.url.localeCompare(b.url);
                return b.score - a.score;
            });
            json = data;
        }
        else
            updateJson(data, 'sitemap');

        done++;
        if (field === 'sitemap') {
            showScore(total / data.length / 3, 3, 'elements');
            show('sitemap');
        }
        else if (done === 5)
            overviewScore();
    });
if (field === 'overview' || field === 'robots')
    getData('robots').then(data => {
        data = filterDomains(data);

        let total = 0, count = 0;
        for (let i = 0; i < data.length; i++) {
            const domain = data[i];

            domain.successes = [];
            domain.failures = [];
            (domain.valid ? domain.successes : domain.failures).push('Valid');
            (domain.allowed ? domain.successes : domain.failures).push('Allowed');
            (domain.sitemap ? domain.successes : domain.failures).push('Sitemap');
            domain.score = Math.round(100 * domain.successes.length / (domain.successes.length + domain.failures.length));
            domain.grade = getGrade(domain.score);

            total += domain.successes.length;
            count++;
        }

        if (field === 'robots') {
            data = data.sort((a, b) => {
                if (a.score === b.score)
                    return a.url.localeCompare(b.url);
                return b.score - a.score;
            });
            json = data;
        }
        else
            updateJson(data, 'robots');

        done++;
        if (field === 'robots') {
            showScore(total / data.length / 3, 3, 'elements');
            show('robots');
        }
        else if (done === 5)
            overviewScore();
    });
if (field === 'overview' || field === 'security')
    getData('security').then(data => {
        data = filterDomains(data);

        let total = 0, count = 0;
        for (let i = 0; i < data.length; i++) {
            const domain = data[i];

            domain.successes = [];
            domain.failures = [];
            (domain.hsts ? domain.successes : domain.failures).push('HSTS');
            (domain.csp ? domain.successes : domain.failures).push('CSP');
            (domain.xContentTypeOptions ? domain.successes : domain.failures).push('X-Content-Type-Options');
            (domain.securityTxt ? domain.successes : domain.failures).push('security.txt');
            domain.score = Math.round(100 * domain.successes.length / (domain.successes.length + domain.failures.length));
            domain.grade = getGrade(domain.score);

            total += domain.successes.length;
            count++;
        }

        if (field === 'security') {
            data = data.sort((a, b) => {
                if (a.score === b.score)
                    return a.url.localeCompare(b.url);
                return b.score - a.score;
            });
            json = data;
        }
        else
            updateJson(data, 'security');

        done++;
        if (field === 'security') {
            showScore(total / data.length / 4, 4, 'elements');
            show('security');
        }
        else if (done === 5)
            overviewScore();
    });
if (field === 'overview' || field === 'metadata')
    getData('metadata').then(data => {
        data = filterDomains(data);

        let total = 0, count = 0;
        for (let i = 0; i < data.length; i++) {
            const domain = data[i];

            if (domain.status !== 200)
                continue;

            for (let j = 0; j < variables.length; j++)
                total += domain[variables[j]];
            count++;
        }

        for (let i = 0; i < data.length; i++) {
            const domain = data[i];

            let successes = [], failures = [];
            for (let j = 0; j < variables.length; j++)
                (domain[variables[j]] ? successes : failures).push(names[j]);
            domain.successes = successes;
            domain.failures = failures;
            domain.score = Math.round(100 * successes.length / (successes.length + failures.length));
            domain.grade = getGrade(domain.score);

            domain.redirects = domain.status === 200 && !domain.redirect.includes(domain.url);
        }
        if (field === 'metadata') {
            data = data.sort((a, b) => {
                if (a.redirects && !b.redirects && b.status === 200)
                    return 1;
                if (!a.redirects && a.status === 200 && b.redirects)
                    return -1;

                if (a.status !== b.status)
                    if (a.status === 200)
                        return -1;
                    else if (b.status === 200)
                        return 1;
                    else
                        return a.status - b.status;
                if (a.successes.length === b.successes.length)
                    return a.url.localeCompare(b.url);
                return b.successes.length - a.successes.length;
            });
            json = data;
        }
        else
            updateJson(data, 'metadata');

        done++;
        if (field !== 'overview') {
            showScore(total / count / variables.length, variables.length, 'tags');
            show('metadata');
        }
        else if (done === 5)
            overviewScore();
    });
