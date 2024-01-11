const properties = ['<title', 'name="description"', 'name="keywords"', 'name="robots"', 'name="viewport"', 'rel="canonical"',
    'name="og:locale"', 'name="og:site_name"', 'name="og:type"', 'name="og:title"', 'name="og:description"', 'name="og:url"',
    'name="og:image"', 'name="og:image:width"', 'name="og:image:height"', 'name="og:image:alt"', 'name="twitter:site"', 'name="twitter:card"',
    'name="twitter:title"', 'name="twitter:description"', 'name="twitter:image"'];
const variables = properties.map(property => {
    if (property.includes('"'))
        property = property.substring(property.indexOf('"') + 1, property.lastIndexOf('"'));
    else
        property = property.substring(property.indexOf('<') + 1);
    return property.replaceAll(/(?:\:|_)([a-z])/g, match => match[1].toUpperCase());
});