import { default as domainData } from './domains.js';
import * as fs from 'fs'

export default function () {

    let domainDataFilled = domainData();

    // remove everything from the array that has no score
    const filteredData = domainDataFilled.filter(obj => 'performance' in obj);

    let performance = filteredData.sort(function (a, b) {
        return parseInt(b.scores['performance'].score) - parseInt(a.scores['performance'].score);
    })

    return performance;
}
