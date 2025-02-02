import { default as domainData } from './domains.js';
import * as fs from 'fs'

export default function () {

  let audits = JSON.parse(fs.readFileSync('./_data/audits.json'));

  let domainDataFilled = domainData();
  console.log('building with this number of domains: '+domainDataFilled.length)

  let domainScoreArray = [];
  domainDataFilled.forEach(d => {				
    // for each score type
    for(const k in d.scores) {
      let domainScoreObject = {};
      domainScoreObject.key = `${d.urlkey}-${k}`
      domainScoreObject.urlkey = d.urlkey
      domainScoreObject.scorekey = k;
      domainScoreObject.scoredisplayname = audits[k].displayName;
      domainScoreObject.details = d;
      domainScoreArray.push(domainScoreObject);
    }
  })

  return domainScoreArray;  
}