fetch('https://api.github.com/repos/civichackingagency/gov-metadata/commits?path=/data&per_page=1').then(res => res.json()).then(data => {
    document.getElementById('updated').innerHTML = new Date(data[0].commit.author.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
});