const check = '<svg class="svg-inline--fa fa-circle-check" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="circle-check" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-fa-i2svg=""><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/></svg>',
    x = '<svg class="svg-inline--fa fa-circle-xmark" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="circle-xmark" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-fa-i2svg=""><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"/></svg>',
    right = '<svg class="svg-inline--fa fa-circle-right" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="circle-right" role="img"  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M0 256a256 256 0 1 0 512 0A256 256 0 1 0 0 256zM294.6 135.1l99.9 107.1c3.5 3.8 5.5 8.7 5.5 13.8s-2 10.1-5.5 13.8L294.6 376.9c-4.2 4.5-10.1 7.1-16.3 7.1C266 384 256 374 256 361.7l0-57.7-96 0c-17.7 0-32-14.3-32-32l0-32c0-17.7 14.3-32 32-32l96 0 0-57.7c0-12.3 10-22.3 22.3-22.3c6.2 0 12.1 2.6 16.3 7.1z"/></svg>',
    exclamation = '<svg class="svg-inline--fa fa-circle-exclamation" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="circle-exclamation" role="img"  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c13.3 0 24 10.7 24 24V264c0 13.3-10.7 24-24 24s-24-10.7-24-24V152c0-13.3 10.7-24 24-24zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/></svg>';

const domain = new URLSearchParams(location.search).get('domain');
document.title = domain + ' report';
document.getElementById('domain').innerText = domain;
document.getElementById('return').href = '/profile?domain=' + domain;

let done = 0;
const finish = () => {
    done++;
    console.log(`finishing, done: ${done} of ${length}`)
    if (done !== 5)
        return;

    print();
}

getData('metadata').then(data => {
    for (let i = 0; i < data.length; i++)
        if (data[i].url === domain) {
            data = data[i];
            break;
        }
    if (done === 0)
        document.getElementById('parent').innerText = data.name;

    const table = document.getElementById('metadata-table');
    let count = 0;

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

    const percent = Math.round(successes.length / variables.length * 100);
    const gradeCard = document.getElementById('metadata-grade-card');
    if (data.status == 200 && !redirect) {
        document.getElementById('metadata-percent').innerText = percent;
        document.getElementById('metadata-amount').innerText = successes.length + ' of ' + variables.length + ' tags';
        gradeCard.classList.add('text-bg-' + getColor(percent));
        document.getElementById('metadata-grade').innerText = getGrade(percent);
    }
    else {
        document.getElementById('metadata-percent').innerText = '-';
        if (data.status != 200)
            document.getElementById('metadata-amount').innerText = domain + ' didn\'t respond';
        else
            document.getElementById('metadata-amount').innerText = domain + ' redirected';
        document.getElementById('metadata-grade').innerText = '-';
    }

    for (const success of successes)
        table.innerHTML += `
        <tr style="page-break-inside: avoid; break-inside: avoid;">
            <td>
                <pre><code class="text-wrap">${success[0]}</code></pre>
            </td> 
            <td>
                ${descriptions[success[1]]}
            </td>
            <td>
                ${check} <span class="d-xl-inline">Active</span>
            </td>
        </tr>
    `;
    for (const danger of dangers)
        table.innerHTML += `
        <tr style="page-break-inside: avoid; break-inside: avoid;">
            <td>
                <pre><code>${danger[0]}</code></pre>
            </td> 
            <td>
                ${descriptions[danger[1]]}    
            </td>
            <td>
                ${redirect ? right : data.status !== 200 ? exclamation : x} <span class="d-xl-inline">${data.status === 200 && !redirect ? 'Missing' : redirect ? 'Redirect' : 'Can\'t access (<a href="/docs/status#' + data.status + '">' + data.status + '</a>)'}</span>
            </td>
        </tr>
    `;
}).finally(finish);

getData('url').then(data => {
    for (let i = 0; i < data.length; i++)
        if (data[i].url === domain) {
            data = data[i];
            break;
        }
    if (done === 0)
        document.getElementById('parent').innerText = data.name;

    const score = Math.round(100 * (data.https + (data.www && CHECK_WWW) + data.dotgov) / (3 - !CHECK_WWW));
    document.getElementById('url-grade').innerText = getGrade(score);
    document.getElementById('url-grade-card').classList.add('text-bg-' + getColor(score));
    document.getElementById('url-percent').innerText = score;
    document.getElementById('url-amount').innerText = data.https + (data.www && CHECK_WWW) + data.dotgov + ' of ' + (3 - !CHECK_WWW) + ' elements';

    const table = document.getElementById('url-table');
    let tableHTML = '';
    tableHTML += `
    <tr>
        <td>
            <pre><code>HTTPS</code></pre>
        </td> 
        <td>
            Privacy and integrity protection.    
        </td>
        <td>
            ${data.status !== 200 ? exclamation : data.https ? check : x} <span class="d-xl-inline">${data.status !== 200 ? 'Can\'t access (<a href="/docs/status#' + data.status + '">' + data.status + '</a>)' : data.https ? 'Active' : 'Missing'}</span>
        </td>
    </tr>`
    if (CHECK_WWW)
        tableHTML += `
    <tr>
        <td>
            <pre><code>www</code></pre>
        </td> 
        <td>
            Resolves with www and non-www input.  
        </td>
        <td>
            ${data.status !== 200 ? exclamation : data.www ? check : x} <span class="d-xl-inline">${data.status !== 200 ? 'Can\'t access (<a href="/docs/status#' + data.status + '">' + data.status + '</a>)' : data.www ? 'Active' : 'Missing'}</span>
        </td>
    </tr>`;
    tableHTML += `<tr>
        <td>
            <pre><code>sTLD</code></pre>
        </td> 
        <td>
            Sponsored top-level domain (.gov / .edu / .mil).   
        </td>
        <td>
            ${data.status !== 200 ? exclamation : data.dotgov ? check : x} <span class="d-xl-inline">${data.status !== 200 ? 'Can\'t access (<a href="/docs/status#' + data.status + '">' + data.status + '</a>)' : data.dotgov ? 'Active' : 'Missing'}</span>
        </td>
    </tr>
`;
    table.innerHTML = tableHTML;
}).finally(finish);

getData('sitemap').then(data => {
    for (let i = 0; i < data.length; i++)
        if (data[i].url === domain) {
            data = data[i];
            break;
        }
    if (done === 0)
        document.getElementById('parent').innerText = data.name;

    const score = Math.round(100 * ((data.status === 200) + data.xml) / 2);
    document.getElementById('sitemap-grade').innerText = getGrade(score);
    document.getElementById('sitemap-grade-card').classList.add('text-bg-' + getColor(score));
    document.getElementById('sitemap-percent').innerText = score;
    document.getElementById('sitemap-amount').innerText = ((data.status === 200) + data.xml) + ' of 2 elements';

    const table = document.getElementById('sitemap-table');
    table.innerHTML += `
    <tr>
        <td>
            <pre><code>Status</code></pre>
        </td>
        <td>
            The HTTP status of /sitemap.xml is OK.
        </td>
        <td>
            ${data.status < 300 ? check : x} <span class="d-xl-inline">${data.status < 300 ? 'Active' : 'Missing  (<a href="/docs/status#' + data.status + '">' + data.status + '</a>)'}</span>
        </td>
    </tr>
    <tr>
        <td>
            <pre><code>XML</code></pre>
        </td>
        <td>
            The sitemap file type is XML.
        </td>
        <td>
            ${data.xml ? check : x} <span class="d-xl-inline">${data.xml ? 'Active' : 'Missing'}</span>
        </td>
    </tr>
`;
}).finally(finish);

getData('robots').then(data => {
    for (let i = 0; i < data.length; i++)
        if (data[i].url === domain) {
            data = data[i];
            break;
        }
    if (done === 0)
        document.getElementById('parent').innerText = data.name;

    const score = Math.round(100 * (data.valid + data.allowed + !!data.sitemap) / 3);
    document.getElementById('robots-grade').innerText = getGrade(score);
    document.getElementById('robots-grade-card').classList.add('text-bg-' + getColor(score));
    document.getElementById('robots-percent').innerText = score;
    document.getElementById('robots-amount').innerText = (data.valid + data.allowed + !!data.sitemap) + ' of 3 elements';

    const table = document.getElementById('robots-table');
    table.innerHTML += `
        <tr>
            <td>
                <pre><code>Valid</code></pre>
            </td>
            <td>
                The robots.txt file exists and is a text file.
            </td>
            <td>
                <i class="fa-solid ${data.valid ? 'fa-circle-check text-success' : 'fa-circle-xmark text-danger'}"></i> <span class="d-xl-inline">${data.valid ? 'Active' : 'Missing'}</span>
            </td>
        </tr>
        <tr>
            <td>
                <pre><code>Allowed</code></pre>
            </td>
            <td>
                The robots.txt file allows access to browsers and scrapers.
            </td>
            <td>
                <i class="fa-solid ${data.allowed ? 'fa-circle-check text-success' : 'fa-circle-xmark text-danger'}"></i> <span class="d-xl-inline">${data.allowed ? 'Active' : 'Missing'}</span>
            </td>
        </tr>
        <tr>
            <td>
                <pre><code>Sitemap</code></pre>
            </td>
            <td>
                The robots.txt file points to a sitemap file.
            </td>
            <td>
                <i class="fa-solid ${data.sitemap ? 'fa-circle-check text-success' : 'fa-circle-xmark text-danger'}"></i> <span class="d-xl-inline">${data.sitemap ? 'Active' : 'Missing'}</span>
            </td>
        </tr>
`;
}).finally(finish);

getData('security').then(data => {
    for (let i = 0; i < data.length; i++)
        if (data[i].url === domain) {
            data = data[i];
            break;
        }
    if (done === 0)
        document.getElementById('parent').innerText = data.name;

    const total = data.hsts + data.csp + data.xContentTypeOptions + data.securityTxt;
    const score = Math.round(100 * total / 4);
    document.getElementById('security-grade').innerText = getGrade(score);
    document.getElementById('security-grade-card').classList.add('text-bg-' + getColor(score));
    document.getElementById('security-percent').innerText = score;
    document.getElementById('security-amount').innerText = total + ' of 4 elements';

    const table = document.getElementById('security-table');
    table.innerHTML += `
        <tr>
            <td>
                <pre><code>HSTS</code></pre>
            </td>
            <td>
                The site automatically upgrades from HTTP to HTTPS.
            </td>
            <td>
                <i class="fa-solid ${data.hsts ? 'fa-circle-check text-success' : 'fa-circle-xmark text-danger'}"></i> <span class="d-xl-inline">${data.hsts ? 'Active' : 'Missing'}</span>
            </td>
        </tr>
        <tr>
            <td>
                <pre><code>CSP</code></pre>
            </td>
            <td>
                The site restricts what can be loaded.
            </td>
            <td>
                <i class="fa-solid ${data.csp ? 'fa-circle-check text-success' : 'fa-circle-xmark text-danger'}"></i> <span class="d-xl-inline">${data.csp ? 'Active' : 'Missing'}</span>
            </td>
        </tr>
        <tr>
            <td>
                <pre><code>X-Content-Type-Options</code></pre>
            </td>
            <td>
                The site prevents mime type sniffing.
            </td>
            <td>
                <i class="fa-solid ${data.xContentTypeOptions ? 'fa-circle-check text-success' : 'fa-circle-xmark text-danger'}"></i> <span class="d-xl-inline">${data.xContentTypeOptions ? 'Active' : 'Missing'}</span>
            </td>
        </tr>
        <tr>
            <td>
                <pre><code>security.txt</code></pre>
            </td>
            <td>
                The site has a security.txt file.
            </td>
            <td>
                <i class="fa-solid ${data.securityTxt ? 'fa-circle-check text-success' : 'fa-circle-xmark text-danger'}"></i> <span class="d-xl-inline">${data.securityTxt ? 'Active' : 'Missing'}</span>
            </td>
        </tr>
    `;
}).finally(finish);
