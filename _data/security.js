import { default as domainData } from './domains.js';
import * as fs from 'fs'

export default function () {

  let domainDataFilled = domainData();

  let security = domainDataFilled.sort(function(a,b) {
    return parseInt(b.scores['security'].score) - parseInt(a.scores['security'].score);
  })

  return security;
}