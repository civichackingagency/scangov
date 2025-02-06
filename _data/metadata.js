import { default as domainData } from './domains.js';
import * as fs from 'fs'

export default function () {

  let domainDataFilled = domainData();

  let metadata = domainDataFilled.sort(function(a,b) {
    return parseInt(b.scores['metadata'].score) - parseInt(a.scores['metadata'].score);
  })

  return metadata;
}