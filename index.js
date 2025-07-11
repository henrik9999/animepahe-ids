import path from 'node:path';
import fs from 'node:fs';
import * as cheerio from 'cheerio';
import puppeteer from 'rebrowser-puppeteer';

async function start(data) {
	const browser = await puppeteer.launch({headless: true});
	const page = await browser.newPage();

	let currentData = !process.argv.includes("--all")
	? JSON.parse(
		fs.readFileSync(path.resolve("data.json"), { encoding: "utf8" })
	  )
	: {};

	if(data) {
		currentData = data;
	}

	const currentTitles = new Set(Object.values(currentData).map(i => i.title));
	
	await page.goto('https://animepahe.com/anime', {
		waitUntil: 'networkidle2',
	});
	await wait(10000);
	await page.waitForSelector('div.index-wrapper a[title]',{timeout: 30000});
	await wait(1000);
	let bodyHTML = await page.evaluate(() => document.documentElement.outerHTML);
	let $ = cheerio.load(bodyHTML);
	const elements = $('a[href^=/anime/]');

	if(!elements.length) {
		throw new Exception("couldnt find anime");
	}

	console.log("elements found: " + elements.length);

	const timestamp = Date.now();

	const animes = elements.map((i, element) => {
		if (!currentTitles.has($(element).text().trim())) {
			return $(element).attr('href');
		}
		return undefined;
	}).get();

	console.log("todo: " + animes.length);

	for (const anime of animes) {
		if((Date.now() - timestamp) > (1000*60*60*2)) {
			await browser.close();
			return start(currentData)
		}
		console.log(anime);
		await wait(Math.floor(Math.random() * 2000) + 100);
		await page.goto('https://animepahe.com' + anime, {
			waitUntil: 'networkidle2',
		});
		await page.waitForSelector('meta[name=id]',{timeout:10000}); 
		bodyHTML = await page.evaluate(() => document.documentElement.outerHTML);
		$ = cheerio.load(bodyHTML);

		const id = $('meta[name=id]').attr('content');
		if (!id) {
			throw new Exception('couldnt find id');
		}

		const malId = $('meta[name=myanimelist]').attr('content');
		const anilistId = $('meta[name=anilist]').attr('content');
		const kitsuId = $('meta[name=kitsu]').attr('content');
		const anidbId = $('meta[name=anidb]').attr('content');
		const annId = $('meta[name=ann]').attr('content');

		const title = $('header.anime-header > div.title-wrapper > h1 > span').text().trim()
		if (!title) {
			throw new Exception('couldnt get title');
		}
		console.log(id, title);
		currentData[id] = {title, malId, anilistId, kitsuId, anidbId, annId};
	}
	await browser.close();
	console.log("total: " + Object.keys(currentData).length);
	fs.writeFileSync(path.resolve('data.json'), JSON.stringify(currentData), {
		encoding: 'utf8',
	});
}

function wait(ms) {
	return new Promise(resolve => {
	  setTimeout(resolve, ms);
	});
}

start(null);
