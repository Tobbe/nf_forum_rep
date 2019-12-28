// ==UserScript==
// @name         NerdFitness forum rep
// @namespace    https://github.com/tobbe
// @version      0.3
// @description  NerdFitness forum - Display reputation
// @author       Tobbe
// @license      MIT
// @match        https://rebellion.nerdfitness.com/index.php?/topic/*
// @exclude      https://rebellion.nerdfitness.com/index.php?/topic/*&do=embed
// @exclude      https://rebellion.nerdfitness.com/index.php?/topic/*&do=embed&*
// @grant        GM_listValues
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      self
// ==/UserScript==

function fetchRep(url) {
    function xhr(resolve, reject, triesLeft) {
        GM_xmlhttpRequest({
            method: "GET",
            url: url + 'reputation/',
            onload: response => {
                const text = response.responseText;

                try {
                    resolve(text.match(/<span\s+class=.cProfileRepScore_points.>\s*(\d+)\s*<\/span>/)[1]);
                } catch (e) {
                    if (triesLeft) {
                        xhr(resolve, reject, --triesLeft);
                    } else {
                        reject('failure');
                    }
                }
            },
        });
    }

    return new Promise((resolve, reject) => {
        xhr(resolve, reject, 4);
    });
}

function getUserId(url) {
    return url.replace(/\/*$/, '').split('/').pop();
}

function insertRep(aside, rep) {
    const repInserted = aside.querySelector('li.rep-inserted');

    if (repInserted) {
        repInserted.innerHTML = 'Rep: ' + rep;
    } else {
        aside.querySelectorAll('ul.cAuthorPane_info li').forEach(li => {
            if (li.textContent.endsWith('posts')) {
                li.insertAdjacentHTML('beforebegin', '<li class="rep-inserted">Rep: ' + rep + '</li>');
            }
        });
    }
}

(function() {
    'use strict';

    const queue = {};
    const cache = GM_getValue('cache');

    const posts = document.querySelectorAll('aside.ipsComment_author');

    posts.forEach(aside => {
        const url = aside.querySelector('h3.cAuthorPane_author a').href;

        if (queue[url]) {
            queue[url].push(aside);
        } else {
            queue[url] = [aside];
        }
    });

    Object.entries(queue).forEach(([url, asides]) => {
        const userId = getUserId(url);

        const cachedRep = cache[userId];

        asides.forEach(aside => {
            insertRep(aside, cachedRep || 'fetching...');
        });

        fetchRep(url).then(rep => {
            const userId = getUserId(url);

            if (cache[userId] !== rep) {
                asides.forEach(aside => {
                    insertRep(aside, rep);
                });

                cache[userId] = rep;

                GM_setValue('cache', cache);
            }
        });
    });
})();