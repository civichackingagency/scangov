const properties = ['<title', 'name="description"', 'name="keywords"', 'name="robots"', 'name="viewport"', 'rel="canonical"',
    'property="og:locale"', 'property="og:site_name"', 'property="og:type"', 'property="og:title"', 'property="og:description"', 'property="og:url"',
    'property="og:image"', 'property="og:image:width"', 'property="og:image:height"', 'property="og:image:alt"', 'name="twitter:card"',
    'name="twitter:title"', 'name="twitter:description"', 'name="twitter:image"'];
const variables = properties.map(property => {
    if (property.includes('"'))
        property = property.substring(property.indexOf('"') + 1, property.lastIndexOf('"'));
    else
        property = property.substring(property.indexOf('<') + 1);
    return property.replaceAll(/(?:\:|_)([a-z])/g, match => match[1].toUpperCase());
});