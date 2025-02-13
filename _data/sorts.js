import { default as domainData } from './domains.js';
import * as fs from 'fs'

export default function () {

    let domainDataFilled = domainData();

    let sortedData = {};
    sortedData.overall = domainDataFilled.sort(function (a, b) {
        return b.overallScore - a.overallScore;
    })

    return sortedData;
}
