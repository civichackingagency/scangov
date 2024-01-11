fetch('data.json').then(res => res.json()).then(data => {
    const table = document.getElementById('table');

    for (let i = 0; i < 10/*data.length*/; i++) {
        console.log(i);
        const agency = data[i];
        const successes = [], dangers = [];
        for (let j = 0; j < variables.length; j++) {
            if (agency[variables[j]])
                successes.push(properties[j]);
            else
                dangers.push(properties[j]);
        }
        const tr = document.createElement('tr');
        let url = agency.url.replace(/http(s|)\:\/\//, '').replace('www.', '');
        if (url.endsWith('/'))
            url = url.slice(0, -1);
        tr.innerHTML = `
                <th scope="row"><a href="profile.html?agency=${agency.name}">${agency.name}</th>
                <td>${url}</td>
                <td>
                    ${successes.map(success => `<i class="fa-solid fa-circle-check text-success" title="${success}"></i>`).join('\n')}
                    <br>
                    ${dangers.map(danger => `<i class="fa-solid fa-circle-xmark text-danger" title="${danger}"></i>`).join('\n')}
                </td>
                <td><a href="profile.html?agency=${agency.name}"><i class="fa-solid fa-circle-play"></i></a></td>
        `;
        table.appendChild(tr);
    }
});