import path from 'node:path';
import fs from 'node:fs';
import cheerio from 'cheerio';
import puppeteer from 'puppeteer-extra';
import pluginStealth from 'puppeteer-extra-plugin-stealth';
import pluginAdblocker from 'puppeteer-extra-plugin-adblocker'

puppeteer.use(pluginStealth());
puppeteer.use(pluginAdblocker());

async function start() {
	const browser = await puppeteer.launch({headless: true});
	const page = await browser.newPage();

	const currentData = JSON.parse(
		fs.readFileSync(path.resolve('data.json'), {encoding: 'utf8'}),
	);
	const currentTitles = new Set(Object.values(currentData).map(i => i.title));
	
	await page.goto('https://animepahe.com/anime', {
		waitUntil: 'networkidle2',
	});
	await page.waitForSelector('div.show a[title]',{timeout: 30000}); 
	let bodyHTML = await page.evaluate(() => document.documentElement.outerHTML);
	let $ = cheerio.load(bodyHTML);
	const elements = $('a[href^=/anime/]');

	if(!elements.length) {
		throw new Exception("couldnt find anime");
	}

	const animes = elements.map((i, element) => {
		if (!currentTitles.has($(element).text().trim())) {
			return $(element).attr('href');
		}
		return undefined;
	}).get();

	for (const anime of animes) {
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
	console.log(Object.keys(currentData).length);
	fs.writeFileSync(path.resolve('data.json'), JSON.stringify(currentData), {
		encoding: 'utf8',
	});
}

function wait(ms) {
	return new Promise(resolve => {
	  setTimeout(resolve, ms);
	});
}

start();
