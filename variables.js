const properties = ['<title', 'name="description"', 'name="robots"', 'name="viewport"', 'rel="canonical"',
    'property="og:locale"', 'property="og:site_name"', 'property="og:type"', 'property="og:title"', 'property="og:description"', 'property="og:url"',
    'property="og:image"', 'property="og:image:alt"'];
const variables = properties.map(property => {
    if (property.includes('"'))
        property = property.substring(property.indexOf('"') + 1, property.lastIndexOf('"'));
    else
        property = property.substring(property.indexOf('<') + 1);
    return property.replaceAll(/(?:\:|_)([a-z])/g, match => match[1].toUpperCase());
});
const descriptions = [
    'Defines the document\'s title that is shown in a browser\'s title bar or a page\'s tab',
    'A short and accurate summary of the content of the page',
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
    'A description of what is in the image',
];