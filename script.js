const params = new URLSearchParams(location.search);
const pageNumber = parseInt(params.get('page')) || 1;
let agencyPage = parseInt(params.get('agency'));
const search = params.get('search') || '';
const searchInput = document.getElementById('search');
searchInput.value = search;

const table = document.getElementById('table');
const pagination = document.getElementById('pagination');
const check = '<svg class="svg-inline--fa fa-circle-check" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="circle-check" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-fa-i2svg=""><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/></svg>',
    x = '<svg class="svg-inline--fa fa-circle-xmark" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="circle-xmark" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-fa-i2svg=""><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"/></svg>';

fetch('data.json').then(res => res.json()).then(data => {
    if (agencyPage) {
        document.getElementById('jumbotron').innerHTML = `
            <h1 class="display-5 fw-bold">${search}</h1>
            <p class="lead mb-4" id="jumbotron-subtitle">.gov domains managed by ${search}.</p>
        `;
        document.getElementById('level').innerHTML = 'Metadata';
    }

    let total = 0, count = 0;
    for (let i = 0; i < data.length; i++) {
        if (data[i].status != 200)
            continue;

        if (agencyPage && data[i].name.toLowerCase() !== search.toLowerCase())
            continue;

        if (data[i].redirect && !data[i].redirect.includes(data[i].url))
            continue;

        count++;
        for (const variable of variables) {
            if (data[i][variable])
                total++;
        }
    }
    const percent = Math.round(total / count / variables.length * 100);
    document.getElementById('percent').innerHTML = Math.round(total / count / variables.length * 100);
    document.getElementById('amount').innerHTML = Math.round(total / count) + ' of ' + variables.length + ' tags';
    document.getElementById('grade').innerHTML = percent >= 90 ? 'A' : percent >= 80 ? 'B' : percent >= 70 ? 'C' : percent >= 60 ? 'D' : 'F';
    document.getElementById('grade-card').classList.add('bg-' + (percent >= 90 ? 'success' : percent >= 70 ? 'warning' : 'danger'));

    displayAgencies(data, search);

    searchInput.onkeyup = e => {
        if (e.key == 'Enter')
            location.search = 'search=' + searchInput.value;
        displayAgencies(data, searchInput.value);
    };
});

const displayAgencies = (agencies, filter) => {
    filter = filter.toLowerCase();
    table.innerHTML = '';

    const data = agencies.sort((a, b) => {
        if (a.status != 200 && b.status != 200)
            return a.status - b.status;
        if (a.status != 200)
            return 1;
        if (b.status != 200)
            return -1;
        if (a.redirect && !a.redirect.includes(a.url))
            return 1;
        if (b.redirect && !b.redirect.includes(b.url))
            return -1;
        let aTotal = 0, bTotal = 0;
        for (const variable of variables) {
            if (a[variable])
                aTotal++;
            if (b[variable])
                bTotal++;
        }
        return bTotal - aTotal;
    }).filter(agency => agency.name.toLowerCase().includes(filter) || agency.url.includes(filter));

    if (filter)
        document.getElementById('score-card').style.display = document.getElementById('level-card').style.display = 'none';
    else
        document.getElementById('score-card').style.display = document.getElementById('level-card').style.display = '';

    pagination.innerHTML = '<li class="page-item"><a class="page-link ' + (pageNumber == 1 ? 'disabled' : '') + '" href="?page=' + (pageNumber - 1) + '&search=' + filter + '">Previous</a></li>';
    for (let page = 0; page < data.length / 100; page++) {
        pagination.innerHTML += `<li class="page-item ${page == pageNumber - 1 ? 'active' : ''}"><a class="page-link" href="?page=${page + 1}&search=${filter}">${page + 1}</a></li>`
    }
    pagination.innerHTML += '<li class="page-item"><a class="page-link ' + ((pageNumber == Math.floor(data.length / 100) + 1) ? 'disabled' : '') + '" href="?page=' + (pageNumber + 1) + '&search=' + filter + '">Next</a></li>';

    for (let i = 100 * (pageNumber - 1); i < Math.min(100 * pageNumber, data.length); i++) {
        const agency = data[i];
        const successes = [], dangers = [];
        for (let j = 0; j < variables.length; j++) {
            let property = properties[j];
            if (property.includes('"'))
                property = property.substring(property.indexOf('"') + 1, property.lastIndexOf('"'));
            else
                property = property.substring(1);
            if (agency[variables[j]])
                successes.push(property);
            else
                dangers.push(property);
        }
        const tr = document.createElement('tr');
        const percent = successes.length / variables.length;
        const redirect = agency.redirect && agency.redirect.includes(agency.url);
        tr.innerHTML = `
                <td scope="row">
                    ${agency.url}
                    <br>
                    <a href="?search=${agency.name}&agency=1"><small>${agency.name}</small></a>
                </td>
                <td>
                    ${agency.status == 200 ? (redirect ?
                `${successes.map(success => `<span title="${success}">${check}</span>`).join('\n')}
                                <br>
                                ${dangers.map(danger => `<span title="${danger}">${x}</span>`).join('\n')}`
                : '<span title="Redirects to ' + agency.redirect + '"><svg class="svg-inline--fa fa-circle-right" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="circle-right" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-fa-i2svg=""><!--! Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2023 Fonticons, Inc. --><path d="M0 256a256 256 0 1 0 512 0A256 256 0 1 0 0 256zM294.6 135.1l99.9 107.1c3.5 3.8 5.5 8.7 5.5 13.8s-2 10.1-5.5 13.8L294.6 376.9c-4.2 4.5-10.1 7.1-16.3 7.1C266 384 256 374 256 361.7l0-57.7-96 0c-17.7 0-32-14.3-32-32l0-32c0-17.7 14.3-32 32-32l96 0 0-57.7c0-12.3 10-22.3 22.3-22.3c6.2 0 12.1 2.6 16.3 7.1z"/></span>')
                : '<span title="Inaccessible (status ' + agency.status + ')"><svg class="svg-inline--fa fa-circle-exclamation" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="circle-exclamation" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-fa-i2svg=""><!--! Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2023 Fonticons, Inc. --><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c13.3 0 24 10.7 24 24V264c0 13.3-10.7 24-24 24s-24-10.7-24-24V152c0-13.3 10.7-24 24-24zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/></span>'
            }
                </td>
                <td class="text-center"><span class="badge text-bg-${(agency.status !== 200 || !redirect) ? '' : (percent >= 0.9 ? 'success' : (percent >= 0.7 ? 'warning' : 'danger'))} font-weight-normal bg-opacity-75" title="${percent * 100}%">${agency.status == 200 && redirect ? (percent >= 0.9 ? 'A' : percent >= 0.8 ? 'B' : percent >= 0.7 ? 'C' : percent >= 0.6 ? 'D' : 'F') : '－'}</span></td>
                <td class="text-center"><a href="profile.html?domain=${agency.url}" aria-label="View report"><svg class="svg-inline--fa fa-file-lines" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="file-lines" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-fa-i2svg=""><!--! Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2023 Fonticons, Inc. --><path d="M64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V160H256c-17.7 0-32-14.3-32-32V0H64zM256 0V128H384L256 0zM112 256H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16z"/></svg></a></td>
        `;
        table.appendChild(tr);
    }
}