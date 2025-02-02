import { PurgeCSS } from 'purgecss'
import * as fs from 'fs';



export default async function () {
  console.log('truncating css')
  const purgeCSSResults = await new PurgeCSS().purge({
    content: [
      '_site/**/*.html'
    ],
    css: ['public/assets/bootstrap/css/bootstrap.min.css'],
  })

  fs.writeFileSync('./_site/bootstrap-purged.css',purgeCSSResults[0].css,'utf8');
}
