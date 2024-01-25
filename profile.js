const agencyURL = new URLSearchParams(location.search).get('domain');

fetch('data.json').then(res => res.json()).then(data => {
    let currentAgency;
    let total = 0, count = 0;
    for (const agency of data) {
        if (agency.status === 200) {
            for (const variable of variables)
                if (agency[variable])
                    total++;
            count++;
        }
        if (agency.url == agencyURL) {
            currentAgency = agency;
            break;
        }
    }
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

    document.getElementById('site').innerHTML = data.url;
    document.getElementById('parent').innerHTML = data.name;
    document.getElementById('parent').href = '/?search=' + data.name + '&agency=1';
    const percent = Math.round(successes.length / variables.length * 100);
    if (data.status === 200 && !redirect) {
        document.getElementById('percent').innerHTML = percent;
        document.getElementById('amount').innerHTML = successes.length + ' of ' + variables.length + ' tags ';
        document.getElementById('grade-card').classList.add('text-bg-' + (percent >= 90 ? 'success' : percent >= 70 ? 'warning' : 'danger'));
        document.getElementById('grade').innerHTML = percent >= 90 ? 'A' : percent >= 80 ? 'B' : percent >= 70 ? 'C' : percent >= 60 ? 'D' : 'F';
    }
    else {
        document.getElementById('percent').innerHTML = '-';
        if (data.status !== 200)
            document.getElementById('amount').innerHTML = agencyURL + ' didn\'t respond';
        else
            document.getElementById('amount').innerHTML = agencyURL + ' redirected';
        document.getElementById('grade').innerHTML = '-';
    }

    const table = document.getElementById('table');
    for (const success of successes)
        table.innerHTML += `
            <tr>
                <td>
                    <pre><code>${success[0]}</code></pre>
                </td> 
                <td>
                    ${descriptions[success[1]]}
                </td>
                <td>
                    <i class="fa-solid fa-circle-check text-success"></i> <span class="d-none d-xl-inline">Active</span>
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
                </td >
            </tr >
        `;

    document.getElementById('linkedin').href = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(location.href)}&title=${document.title}&summary=${data.url}%20website%20metadata%20information.&source=Civic%20Hacking%20Agency`;
    document.getElementById('twitter').href = `https://twitter.com/intent/tweet?text=${data.url}%20website%20metadata%20information.&via=civic_hacking&url=${encodeURIComponent(location.href)}`;
    document.getElementById('facebook').href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.href)}`;
});