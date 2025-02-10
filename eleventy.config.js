import {
  IdAttributePlugin,
  InputPathToUrlTransformPlugin,
  HtmlBasePlugin,
} from '@11ty/eleventy'
import { feedPlugin } from '@11ty/eleventy-plugin-rss'
import pluginSyntaxHighlight from '@11ty/eleventy-plugin-syntaxhighlight'
import pluginNavigation from '@11ty/eleventy-navigation'
import { eleventyImageTransformPlugin } from '@11ty/eleventy-img'
import { EleventyRenderPlugin } from '@11ty/eleventy'
import * as fs from 'fs'
import pluginFilters from './_config/filters.js'
import fontAwesomePlugin from "@11ty/font-awesome";
import { PurgeCSS } from 'purgecss'

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default async function (eleventyConfig) {
  let audits = JSON.parse(fs.readFileSync('./_data/audits.json'));
  eleventyConfig.addPlugin(fontAwesomePlugin);

  // Drafts, see also _data/eleventyDataSchema.js
  eleventyConfig.addPreprocessor('drafts', '*', (data, content) => {
    if (data.draft && process.env.ELEVENTY_RUN_MODE === 'build') {
      return false
    }
  })

  // Copy the contents of the `public` folder to the output folder
  // For example, `./public/css/` ends up in `_site/css/`
  eleventyConfig
    .addPassthroughCopy({
      './public/': '/',
      'CNAME': 'CNAME'
    })
    .addPassthroughCopy('./content/feed/pretty-atom-feed.xsl')

  // Run Eleventy when these files change:
  // https://www.11ty.dev/docs/watch-serve/#add-your-own-watch-targets

  // Watch content images for the image pipeline.
  eleventyConfig.addWatchTarget('content/**/*.{svg,webp,png,jpeg}')

  // Per-page bundles, see https://github.com/11ty/eleventy-plugin-bundle
  // Adds the {% css %} paired shortcode
  eleventyConfig.addBundle('css', {
    toFileDirectory: 'dist',
  })
  // Adds the {% js %} paired shortcode
  eleventyConfig.addBundle('js', {
    toFileDirectory: 'dist',
  })

  // Official plugins
  eleventyConfig.addPlugin(pluginSyntaxHighlight, {
    preAttributes: { tabindex: 0 },
  })
  eleventyConfig.addPlugin(pluginNavigation)
  eleventyConfig.addPlugin(HtmlBasePlugin)
  eleventyConfig.addPlugin(InputPathToUrlTransformPlugin)

  // Filters
  eleventyConfig.addPlugin(pluginFilters)

  eleventyConfig.addPlugin(IdAttributePlugin, {
    // by default we use Eleventy’s built-in `slugify` filter:
    // slugify: eleventyConfig.getFilter("slugify"),
    // selector: "h1,h2,h3,h4,h5,h6", // default
  })

  eleventyConfig.addShortcode('currentBuildDate', () => {
    return new Date().toISOString()
  })

  eleventyConfig.addFilter('standardFormatDate', (time) => {
    return new Date(time).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' });
  })

  eleventyConfig.addFilter('scanResultWriteUp', (log, scorekey) => {
    let scoreAttributeCount = 0;
    let numCorrect = 0;
    let attributesToCheck = [];
    for(var a in audits[scorekey].attributes) {
      attributesToCheck.push(audits[scorekey].attributes[a].key);
    }
    for(var attr in log) {
      if(attributesToCheck.indexOf(attr) > -1) {
        if(log[attr]) {
          numCorrect++
        }
        scoreAttributeCount++;
      }
    }
    let score = Math.round((numCorrect / scoreAttributeCount) * 100);
    return `Grade: ${gradeThis(score)} / Score: ${score}% (${numCorrect} of ${scoreAttributeCount} tags)`;
  })

  function writeStatusIconsForAttribute(log, scorekey) {
    let output = '';
    let attributesToCheck = [];
    for(var a in audits[scorekey].attributes) {
      attributesToCheck.push(audits[scorekey].attributes[a].key);
    }
    for(var attr in log) {
      if(attributesToCheck.indexOf(attr) > -1) {
        let attrDisplayName = attr;
        audits[scorekey].attributes.forEach(attrEl => {
          if(attrEl.key === attr) {
            attrDisplayName = attrEl.displayName;
          }
        })
        if(log[attr]) {
          output +=` <span title="${attrDisplayName} (${scorekey})"><i class="fa-solid fa-circle-check text-success" >check</i></span>`;
        } else {
          output += ` <span title="${attrDisplayName} (${scorekey})"><i class="fa-solid fa-circle-xmark text-danger">x</i></span>`
        }
      }
    }
    return output;
  }
  eleventyConfig.addFilter('auditStatusIcons', (log, scorekey) => {
    let output = writeStatusIconsForAttribute(log, scorekey);
    return output;
  })

  eleventyConfig.addFilter('allAuditStatusIcons', (domainData) => {
    let output = '';
    if(domainData.status !== 200) {
      output = `<span title="Inaccessible (status 500)">
      <i class="fa-solid fa-circle-exclamation text-warning">!</i></span>`
    } else {
      for(var a in audits) {
        output += writeStatusIconsForAttribute(domainData[a], a);
      }
    }
    return output;
  })

  eleventyConfig.addFilter('averageElements', (data) => {
    let elementTally = 0;
    let respondingDomains = 0;
    let overallPossibleElements = data[0].overallPossibleScore;
    data.forEach(d => {
      if(d.status === 200) {
        elementTally += d.overallScoreCount;
        respondingDomains++;
      }
    })
    let averageElements = Math.round(elementTally / respondingDomains);
    return `${averageElements} out of ${overallPossibleElements} elements`;
  })

  eleventyConfig.addFilter('averageGrade', (data) => {
    let score = scoreCalc(data);
    let grade = gradeThis(score);
    return grade;
  })
  
  function scoreCalc(data) {
    let totalScore = 0;
    let respondingDomains = 0;
    data.forEach(d => {
      if(d.status === 200) {
        totalScore += d.overallScore;
        respondingDomains++;  
      }
    })
    let averageScore = Math.round(totalScore / respondingDomains);
    return averageScore;
  }

  eleventyConfig.addFilter('averageScore', (data) => {
    let output= scoreCalc(data);
    return output;
  })

  eleventyConfig.addFilter('specificAverageScore', (data, attribute) => {
    let totalScores = 0;
    let totalItems = 0;
    data.forEach(d => {
      if(d.status === 200) {
        totalScores += d.scores[attribute].score;
        totalItems++;
      }
    })
    return Math.round(totalScores / totalItems);
  })

  eleventyConfig.addFilter('specificAverageElements', (data, attribute) => {
    let elementTally = 0;
    let respondingDomains = 0;
    let overallPossibleElements = 0;
    
    for(var attr in audits[attribute].attributes) {
      overallPossibleElements++;
    }
    data.forEach(d => {
      if(d.status === 200) {
        for(var attr in audits[attribute].attributes) {
          let key = audits[attribute].attributes[attr].key;
          if(d[attribute][key] === true) {
            elementTally++;
          }
        }
        respondingDomains++;
      }
    })
    let averageElements = Math.round(elementTally / respondingDomains);
    return `${averageElements} out of ${overallPossibleElements} elements`;
  })

  eleventyConfig.addFilter('averageColor', (data) => {
    return gradeColor(scoreCalc(data));
  })
  
  eleventyConfig.addFilter('timeSort', (logs) => {
    return logs.sort((a,b) => b.time - a.time);
  })

  eleventyConfig.addPlugin(EleventyRenderPlugin)

  eleventyConfig.addFilter('gradify', (score) => {
    return gradeThis(score);
  })

  function gradeThis(score) {
    if (score >= 90) return 'A'
    if (score >= 80) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  }

  eleventyConfig.addFilter('percentify', (score) => {
    return Math.round(score) + '%'
  })

  function gradeColor(score) {
    if (score >= 90) return 'success'
    if (score >= 70) return 'warning'
    return 'danger'
  }

  eleventyConfig.addFilter('colorify', (score) => {
    return gradeColor(score);
  })

  // Features to make your build faster (when you need them)

  // If your passthrough copy gets heavy and cumbersome, add this line
  // to emulate the file copy on the dev server. Learn more:
  // https://www.11ty.dev/docs/copy/#emulate-passthrough-copy-during-serve

  // eleventyConfig.setServerPassthroughCopyBehavior("passthrough");

  eleventyConfig.on(
		"eleventy.after",
		async ({ dir, results, runMode, outputMode }) => {
      console.log('truncating css')
      const purgeCSSResults = await new PurgeCSS().purge({
        content: [
          '_site/assets/purge/states.html',
          '_site/index.html'
        ],
        css: ['public/assets/bootstrap/css/bootstrap.min.css'],
      })

      fs.writeFileSync('./_site/bootstrap-purged.css',purgeCSSResults[0].css,'utf8');

		}
	);
}

export const config = {
  // Control which files Eleventy will process
  // e.g.: *.md, *.njk, *.html, *.liquid
  templateFormats: ['md', 'njk', 'html', 'liquid', '11ty.js'],

  // Pre-process *.md files with: (default: `liquid`)
  markdownTemplateEngine: 'njk',

  // Pre-process *.html files with: (default: `liquid`)
  htmlTemplateEngine: 'njk',

  // These are all optional:
  dir: {
    input: 'content', // default: "."
    includes: '../_includes', // default: "_includes" (`input` relative)
    data: '../_data', // default: "_data" (`input` relative)
    output: '_site',
  },
}
