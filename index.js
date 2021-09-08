import fetch from 'node-fetch';
import cheerio from 'cheerio';
import path from "path";
import fs from "fs";

async function start(){
    const response = await fetch("https://animepahe.com/anime", {headers: {"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36"}})
    const body = await response.text();
    const $ = cheerio.load(body);

    const animes = $('a[href^=/anime/]').map(function(i,el) { return $(el).attr('href') }).get();
    console.log(animes.length);
    
    const data = {};
    for(const anime of animes) {
        console.log(anime);
        const response = await fetch("https://animepahe.com" + anime, {headers: {"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36"}})
        const body = await response.text();
        const $ = cheerio.load(body);

        let id;
        const pahe = $('a[href^="//pahe.win/a/"]').attr('href');
        if (pahe) {
            id = pahe.split('/')[4];
        } else {
            continue;
        }

        let title = $('.title-wrapper i').first().attr('title').replace('Bookmark', '').trim();
        if (!title) title = $('.title-wrapper h1').contents().get(0).nodeValue;
        data[id] = {title}
    }

    console.log(Object.keys(data).length);

    if(Object.keys(data).length > 4100) {
        fs.writeFileSync(path.resolve("data.json"), JSON.stringify(data), {
            encoding: "utf8",
        });
    }
}

start();