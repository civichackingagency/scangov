const agencyURL = new URLSearchParams(location.search).get('domain');

fetch('data.json').then(res => res.json()).then(data => {
    let currentAgency;
    let total = 0;
    for (const agency of data)
        if (agency.url == agencyURL) {
            currentAgency = agency;
            break;
        }
    const listData = data;
    data = currentAgency;

    const successes = [], dangers = [];
    const redirect = data.redirect && !data.redirect.includes(data.url);
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

    document.getElementById('site').innerText = data.url;
    document.getElementById('parent').innerText = data.name;
    document.getElementById('parent').href = '/?search=' + data.name + '&agency=1';
    document.getElementById('visit-link').href = data.redirect;
    const viewRedirect = document.getElementById('view-redirect');
    if (redirect) {
        let redirectDomain;
        for (let i = 0; i < listData.length; i++)
            if (data.redirect.includes(listData[i].url)) {
                redirectDomain = listData[i].url;
                break;
            }
        if (redirectDomain) {
            viewRedirect.href = 'profile.html?domain=' + redirectDomain;
            viewRedirect.classList.remove('d-none');
        }
        else
            viewRedirect.parentElement.removeChild(viewRedirect);
    }
    else
        viewRedirect.parentElement.removeChild(viewRedirect);
    const percent = Math.round(successes.length / variables.length * 100);
    if (data.status == 200 && !redirect) {
        document.getElementById('percent').innerText = percent;
        document.getElementById('amount').innerText = successes.length + ' of ' + variables.length + ' tags ';
        document.getElementById('grade-card').classList.add('text-bg-' + (percent >= 90 ? 'success' : percent >= 70 ? 'warning' : 'danger'));
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

    const check = '<svg class="svg-inline--fa fa-circle-check" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="circle-check" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-fa-i2svg=""><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/></svg>',
        x = '<svg class="svg-inline--fa fa-circle-xmark" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="circle-xmark" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-fa-i2svg=""><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"/></svg>';
    const table = document.getElementById('table');
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
            </tr >
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
});