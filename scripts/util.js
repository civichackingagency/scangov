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

const CHECK_WWW = true;

let cache;
const getData = async (file) => {
    if (!cache)
        cache = await caches.open('data');

    file = '/data/' + file + '.json';

    let data = await cache.match(file);
    if (!data) {
        await cache.add(file);
        await cache.put('/timestamp', new Response(Date.now()));
        data = await cache.match(file);
    }

    return data.json();
};

const getCacheTime = async () => {
    if (!cache)
        cache = await caches.open('data');

    const timestamp = await cache.match('/timestamp');
    if (!timestamp)
        return Date.now();

    return timestamp.json();
};

const clearCache = async () => {
    if (!cache)
        cache = await caches.open('data');

    const promises = (await cache.keys()).map(key => cache.delete(key));

    await Promise.all(promises);

    return;
};