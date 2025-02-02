import { default as domainData } from './domains.js';
import * as fs from 'fs'

export default function () {

  let audits = JSON.parse(fs.readFileSync('./_data/audits.json'));

  let domainDataFilled = domainData();

  let sortedData = domainDataFilled.sort(function(a,b) {
    return a.overallScoreCount - b.overallScoreCount;
  })

  console.log('sort length: '+sortedData.length)
  
  return sortedData;
}