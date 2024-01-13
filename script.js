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
        tr.innerHTML = `
                <td scope="row">
                    ${url.substring(0, ((url.indexOf('/') + 1) || url.length + 1) - 1)}
                    <br>
                    ${agency.name}
                </td>
                <td>
                    ${agency.status == 200 ?
                `${successes.map(success => `<span title="${success}">${check}</span>`).join('\n')}
                                <br>
                                ${dangers.map(danger => `<span title="${danger}">${x}</span>`).join('\n')}`
                : agency.status
            }
                </td>
                <td>${agency.status == 200 ? Math.round(successes.length / variables.length * 100) : 0}%</td>
                <td><a href="profile.html?agency=${agency.name}"><svg class="svg-inline--fa fa-file-circle-check" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="file-circle-check" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-fa-i2svg=""><!--! Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2023 Fonticons, Inc. --><path d="M0 64C0 28.7 28.7 0 64 0H224V128c0 17.7 14.3 32 32 32H384v38.6C310.1 219.5 256 287.4 256 368c0 59.1 29.1 111.3 73.7 143.3c-3.2 .5-6.4 .7-9.7 .7H64c-35.3 0-64-28.7-64-64V64zm384 64H256V0L384 128zM288 368a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm211.3-43.3c-6.2-6.2-16.4-6.2-22.6 0L416 385.4l-28.7-28.7c-6.2-6.2-16.4-6.2-22.6 0s-6.2 16.4 0 22.6l40 40c6.2 6.2 16.4 6.2 22.6 0l72-72c6.2-6.2 6.2-16.4 0-22.6z"/></svg></a></td>
        `;
        table.appendChild(tr);
    }
});