import * as fs from 'fs';

const MetaDataVariables = [
  'title',
  'description',
  'viewport',
  'canonical',
  'ogSiteName',
  'ogType',
  'ogTitle',
  'ogDescription',
  'ogUrl',
  'ogImage',
  'ogImageAlt'
];

const robotsDataVariables = [
  'valid',
  'allowed',
  'sitemap'
]

const sitemapDataVariables = [
  'status',
  'xml',
  'completion'
]

const securityDataVariables = [
  'hsts',
  'csp',
  'xContentTypeOptions',
  'securityTxt'
]

const urlDataVariables = [
  'https',
  'dotgov',
  'www'
]

export default function () {
  let devModeDomainLimit = 10;

  let metadata = JSON.parse(fs.readFileSync('./public/data/metadata.json'));
  let robotdata = JSON.parse(fs.readFileSync('./public/data/robots.json'));
  let securitydata = JSON.parse(fs.readFileSync('./public/data/security.json'));
  let sitemapdata = JSON.parse(fs.readFileSync('./public/data/sitemap.json'));
  let urldata = JSON.parse(fs.readFileSync('./public/data/url.json'));

  let allDataMap = new Map();
  let allDataArray = [];
  let truncateCount = 0;
  let overallPossibleScore = 0;
  let overallScoreCount = 0;
  metadata.forEach(m => {
    let newObject = {};
    newObject.metadata = m;
    newObject.urlkey = m.url
    newObject.status = m.status;
    newObject.name = m.name;
    newObject.redirect = m.redirect;
    if((process.env.ELEVENTY_RUN_MODE !== 'serve') || (truncateCount < devModeDomainLimit)) {
      allDataMap.set(m.url,newObject);
    }
    truncateCount++;
  });
  robotdata.forEach(r => {
    let newObject = {};
    if(allDataMap.get(r.url)) {
      newObject = allDataMap.get(r.url);
      newObject.robots = r;
      allDataMap.set(r.url,newObject);
    }
  })
  securitydata.forEach(s => {
    let newObject = {};
    if(allDataMap.get(s.url)) {
      newObject = allDataMap.get(s.url);
      newObject.security = s;
      allDataMap.set(s.url,newObject);
    }
  })
  sitemapdata.forEach(s => {
    let newObject = {};
    if(allDataMap.get(s.url)) {
      newObject = allDataMap.get(s.url);
      newObject.sitemap = s;
      allDataMap.set(s.url,newObject);
    }
  })
  urldata.forEach(u => {
    let newObject = {};
    if(allDataMap.get(u.url)) {
      newObject = allDataMap.get(u.url);
      newObject.url = u;
      allDataMap.set(u.url,newObject);
    }
  })

  // compute the grades here
  allDataMap.forEach((d, keys) => {
    let metadataTotal = 0;
    d.scores = {};
    let metaDataAttributeResults = {};
    MetaDataVariables.forEach(v => {
      if (d.metadata[v]) {
        metadataTotal++;
      }
      metaDataAttributeResults[v] = d.metadata[v];
    })
    let metadataScore = Math.round(metadataTotal / MetaDataVariables.length * 100);
    d.scores['metadata'] = {"score": metadataScore, "correct": metadataTotal, "all": MetaDataVariables.length, attributes: metaDataAttributeResults };
    overallPossibleScore += MetaDataVariables.length;
    overallScoreCount += metadataTotal;

    let robotsTotal = 0;
    let robotsAttributeResults = {};
    robotsDataVariables.forEach(v => {
      if (d.robots[v]) {
        robotsTotal++;
      }
      robotsAttributeResults[v] = d.robots[v];
    })
    let robotsScore = Math.round(robotsTotal / robotsDataVariables.length * 100);
    d.scores['robots'] = {"score": robotsScore, "correct": robotsTotal, "all": robotsDataVariables.length, attributes: robotsAttributeResults };
    overallPossibleScore += robotsDataVariables.length;
    overallScoreCount += robotsTotal;

    let sitemapTotal = 0;    
    let sitemapAttributeResults = {};
    sitemapDataVariables.forEach(v => {
      if (d.sitemap[v]) {
        // these aren't true false at the moment so translate them
        // status: 200,
        // completion: 1,
        // xml: true,
        if(v=='status') {
          if(d.sitemap[v] === 200) {
            d.sitemap[v] = true;
            sitemapTotal++;
          }
        }
        if(v=='completion') {
          if(d.sitemap[v] === 1) {
          d.sitemap[v] = true;
          sitemapTotal++;
        }
        } else {
          sitemapTotal++;
        }
      }
      sitemapAttributeResults[v] = d.sitemap[v];
    })
    let sitemapScore = Math.round(100 * (sitemapTotal / sitemapDataVariables.length));
    d.scores['sitemap'] = {"score": sitemapScore, "correct": sitemapTotal, "all": sitemapDataVariables.length, attributes: sitemapAttributeResults };
    overallPossibleScore += sitemapDataVariables.length;
    overallScoreCount += sitemapTotal;

    let securityTotal = 0;
    let securityAttributeResults = {};
    securityDataVariables.forEach(v => {
      if (d.security[v]) {
        securityTotal++;
      }
      securityAttributeResults[v] = d.security[v];
    })
    let securityScore = Math.round(securityTotal / securityDataVariables.length * 100);
    d.scores['security'] = {"score": securityScore, "correct": securityTotal, "all": securityDataVariables.length, attributes: securityAttributeResults };
    overallPossibleScore += securityDataVariables.length;
    overallScoreCount += securityTotal;

    let urlTotal = 0;
    let urlAttributeResults = {};
    urlDataVariables.forEach(v => {
      if (d.url[v]) {
        urlTotal++;
      }
      urlAttributeResults[v] = d.url[v];
    })
    let urlScore = Math.round(urlTotal / urlDataVariables.length * 100);
    overallPossibleScore += urlDataVariables.length;
    overallScoreCount += urlTotal;
  
    d.scores['url'] = {"score": urlScore, "correct": urlTotal, "all": urlDataVariables.length, attributes: urlAttributeResults };

    d.overallPossibleScore = overallPossibleScore;
    d.overallScoreCount = overallScoreCount;
    allDataArray.push(d)
  })

	return allDataArray;
}