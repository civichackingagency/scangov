const getGrade = score => {
    if (score >= 90)
        return 'A';
    if (score >= 80)
        return 'B';
    if (score >= 70)
        return 'C';
    if (score >= 60)
        return 'D';
    return 'F';
};

const getColor = score => {
    if (score >= 90)
        return 'success';
    if (score >= 70)
        return 'warning';
    return 'danger';
};

let CHECK_WWW = true;

let cache, updateTime, updateTimeReq;
const getData = async (file) => {
    if (!updateTimeReq) {
        updateTimeReq = fetch('/data/updated_time').then(res=>res.text());
        updateTime = new Date(parseInt(await updateTimeReq));
    }
    else
        await updateTimeReq;
    if (document.getElementById('updated'))
        document.getElementById('updated').innerText = updateTime.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });

    if (caches) {
        // Cache API is available
        if (!cache)
            cache = await caches.open('data');

        const cacheTime = await getCacheTime();

        if (cacheTime < updateTime.getTime()) {
            // New data, clear cached data
            if (!cache)
                cache = await caches.open('data');

            const promises = (await cache.keys()).map(key => cache.delete(key));

            await Promise.all(promises);
        }


        file = '/data/' + file + '.json';

        let data = await cache.match(file);
        if (!data) {
            // Data isn't cached, make a request and store it
            await cache.add(file);
            await cache.put('/timestamp', new Response(Date.now()));
            data = await cache.match(file);
        }

        return data.json();
    }
    else {
        // Cache API isn't available so just make a request
        return await (await fetch('/data/' + file + '.json')).json();
    }
};

const getCacheTime = async () => {
    if (!cache)
        cache = await caches.open('data');

    const timestamp = await cache.match('/timestamp');
    if (!timestamp)
        return Date.now();

    return timestamp.json();
};
