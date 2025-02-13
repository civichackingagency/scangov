import { default as domainData } from './domains.js';
import * as fs from 'fs'

export default function () {

    let domainDataFilled = domainData();

    let metadata = domainDataFilled.sort(function (a, b) {
        return b.scores['metadata'].score - a.scores['metadata'].score;
    })

    return metadata;
}
