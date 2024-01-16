const descriptions = [
    'Defines the document\'s title that is shown in a browser\'s title bar or a page\'s tab',
    'A short and accurate summary of the content of the page',
    'Words relevant to the page\'s content separated by commas',
    'The behavior that cooperative crawlers, or "robots", should use with the page',
    'Gives hints about the size of the initial size of the viewport',
    'Indicates that another page is representative of the content on the page',
    'The locale these tags are marked up in',
    'The name which should be displayed for the overall site',
    'The type of the object',
    'The title of the object as it should appear within the graph',
    'A one to two sentence description of the object',
    'The canonical URL of the object that will be used as its permanent ID in the graph',
    'An image URL which should represent the object within the graph',
    'The width of the image in pixels',
    'The height of the image in pixels',
    'A description of what is in the image',
    'The card type',
    'The title of the content',
    'A description of the content',
    'The URL of the image to use in the card'
];

const agencyURL = new URLSearchParams(location.search).get('agency');

fetch('data-all-dotgov.json').then(res => res.json()).then(data => {
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
    for (let i = 0; i < variables.length; i++)
        if (data[variables[i]] && data.status === 200)
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
    document.getElementById('name').innerHTML = data.url;
    const percent = Math.round(successes.length / variables.length * 100);
    if (data.status === 200) {
        document.getElementById('percent').innerHTML = percent;
        document.getElementById('amount').innerHTML = successes.length + ' of ' + variables.length + ' tags ';
        document.getElementById('average').innerHTML = Math.round(total / count / variables.length * 100);
    }
    else {
        document.getElementById('score-title').innerHTML = 'Status';
        document.getElementById('score').innerHTML = `
            <div class="card-body text-center">
                <p class="display-1 fw-bold">
                    ${data.status}
                </p>
            </div>
            <div class="card-footer text-center">${data.url} didn't respond</div>
        `;
    }
    document.getElementById('grade-card').classList.add('bg-' + (percent >= 90 ? 'success' : percent >= 70 ? 'warning' : 'danger'));
    document.getElementById('grade').innerHTML = percent >= 90 ? 'A' : percent >= 80 ? 'B' : percent >= 70 ? 'C' : percent >= 60 ? 'D' : 'F';

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
                    <i class="fa-solid fa-circle-xmark text-danger"></i> <span class="d-none d-xl-inline">Missing</span>
                </td>
            </tr>
        `;

    document.getElementById('linkedin').href = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(location.href)}&title=${document.title}&summary=${data.url}%20website%20metadata%20information.&source=Civic%20Hacking%20Agency`;
    document.getElementById('twitter').href = `https://twitter.com/intent/tweet?text=${data.url}%20website%20metadata%20information.&via=civic_hacking&url=${encodeURIComponent(location.href)}`;
    document.getElementById('facebook').href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.href)}`;
});