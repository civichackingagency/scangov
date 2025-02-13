import { default as domainData } from './domains.js';
import * as fs from 'fs'

export default function () {

    let domainDataFilled = domainData();

    let url = domainDataFilled.sort(function (a, b) {
        return parseInt(b.scores['url'].score) - parseInt(a.scores['url'].score);
    })

    return url;
}
