const include = (includeName, element) =>
    fetch('includes/' + includeName + '.html')
        .then(res => res.text())
        .then(data => document.getElementById(element).innerHTML = data)
        .then(() => {
            if (includeName == 'share') {
                const params = new URLSearchParams(location.search);
                let url = params.get('domain');
                if (!url && params.get('agency') == 1)
                    url = params.get('search');
                document.getElementById('linkedin').href = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(location.href)}&title=${document.title}&summary=${url}%20website%20metadata%20information.&source=Civic%20Hacking%20Agency`;
                document.getElementById('twitter').href = `https://twitter.com/intent/tweet?text=${url}%20website%20metadata%20information.&via=civic_hacking&url=${encodeURIComponent(location.href)}`;
                document.getElementById('facebook').href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.href)}`;
            }
        });