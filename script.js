fetch('data.json').then(res => res.json()).then(data => {
    const table = document.getElementById('table');
    const check = '<svg class="svg-inline--fa fa-circle-check" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="circle-check" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-fa-i2svg=""><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/></svg>',
        x = '<svg class="svg-inline--fa fa-circle-xmark" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="circle-xmark" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-fa-i2svg=""><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"/></svg>';

    data = data.sort((a, b) => {
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
    });
    for (let i = 0; i < data.length; i++) {
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
        let url = agency.url.replace(/http(s|)\:\/\//, '').replace('www.', '');
        if (url.endsWith('/'))
            url = url.slice(0, -1);
        const percent = successes.length / variables.length;
        tr.innerHTML = `
                <td scope="row">
                    ${url}
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
                <td><span class="badge text-bg-danger font-weight-normal bg-opacity-75">${agency.status == 200 ? (percent >= 0.9 ? 'A' : percent >= 0.8 ? 'B' : percent >= 0.7 ? 'C' : percent >= 0.6 ? 'D' : 'F') : 'F'}</span></td>
                <td class="text-end"><a href="profile.html?agency=${agency.name}" aria-label="View report"><svg class="svg-inline--fa fa-circle-play" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="circle-play" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-fa-i2svg=""><!--! Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2023 Fonticons, Inc. --><path d="M0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zM188.3 147.1c-7.6 4.2-12.3 12.3-12.3 20.9V344c0 8.7 4.7 16.7 12.3 20.9s16.8 4.1 24.3-.5l144-88c7.1-4.4 11.5-12.1 11.5-20.5s-4.4-16.1-11.5-20.5l-144-88c-7.4-4.5-16.7-4.7-24.3-.5z"/></svg></a></td>
        `;
        table.appendChild(tr);
    }
});