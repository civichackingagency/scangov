const params = new URLSearchParams(location.search);
const pageNumber = parseInt(params.get('page')) || 1;
const search = params.get('search') || '';
const searchInput = document.getElementById('search');
searchInput.value = search;

const table = document.getElementById('table');
const pagination = document.getElementById('pagination');
const check = '<svg class="svg-inline--fa fa-circle-check" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="circle-check" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-fa-i2svg=""><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/></svg>',
    x = '<svg class="svg-inline--fa fa-circle-xmark" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="circle-xmark" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-fa-i2svg=""><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"/></svg>';

fetch('data-all-dotgov.json').then(res => res.json()).then(data => {
    let total = 0, count = 0;
    for (let i = 0; i < data.length; i++) {
        if (data[i].status != 200)
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
    table.innerHTML = '';

    const data = agencies.sort((a, b) => {
        if (a.status != 200 && b.status != 200)
            return 0;
        if (a.status != 200)
            return 1;
        if (b.status != 200)
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
    console.log(pageNumber, data.length);

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
        tr.innerHTML = `
                <td scope="row">
                    ${agency.url}
                    <br>
                    <small>${agency.name}</small>
                </td>
                <td>
                    ${agency.status == 200 ?
                `${successes.map(success => `<span title="${success}">${check}</span>`).join('\n')}
                                <br>
                                ${dangers.map(danger => `<span title="${danger}">${x}</span>`).join('\n')}`
                : agency.status
            }
                </td>
                <td><span class="badge text-bg-${agency.status !== 200 ? 'danger' : (percent >= 0.9 ? 'success' : (percent >= 0.7 ? 'warning' : 'danger'))} font-weight-normal bg-opacity-75" title="${percent * 100}%">${agency.status == 200 ? (percent >= 0.9 ? 'A' : percent >= 0.8 ? 'B' : percent >= 0.7 ? 'C' : percent >= 0.6 ? 'D' : 'F') : 'F'}</span></td>
                <td class="text-end"><a href="profile.html?agency=${agency.url}" aria-label="View report"><svg class="svg-inline--fa fa-circle-play" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="circle-play" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-fa-i2svg=""><!--! Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2023 Fonticons, Inc. --><path d="M0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zM188.3 147.1c-7.6 4.2-12.3 12.3-12.3 20.9V344c0 8.7 4.7 16.7 12.3 20.9s16.8 4.1 24.3-.5l144-88c7.1-4.4 11.5-12.1 11.5-20.5s-4.4-16.1-11.5-20.5l-144-88c-7.4-4.5-16.7-4.7-24.3-.5z"/></svg></a></td>
        `;
        table.appendChild(tr);
    }
}