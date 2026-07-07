import * as cheerio from 'cheerio';
import type { Parser } from '../types.js';
import type { ParsedRecipe, Ingredient, Instruction } from '../../types/index.js';

const parser: Parser = {
  domain: 'sobors.hu',
  async parse(html: string, url: string): Promise<ParsedRecipe> {
    const $ = cheerio.load(html);

    const title =
      $('h3.recept_nev').first().text().trim() ||
      $('h1').first().text().trim() ||
      'Untitled Recipe';

    // Amount/unit/name are already split by the site into dedicated spans.
    const ingredients: Ingredient[] = [];
    $('.hozzavalok-container li').each((_, li) => {
      const $li = $(li);
      const name = $li.find('.hozzavalo').first().text().trim();
      if (!name) return;
      const amount = $li.find('.mennyiseg').first().text().trim();
      const unit = $li.find('.mertekegyseg').first().text().trim();
      ingredients.push({ amount, unit, name });
    });

    const instructions: Instruction[] = $('.recept_leiras p')
      .map((_, p) => $(p).text().trim())
      .get()
      .filter(Boolean)
      .map((text, i) => ({ step: i + 1, text }));

    // "Előkészítési idő" (prep time) and "Elkészítési idő" (cook time) are separate rows.
    let prepTime: number | undefined;
    let cookTime: number | undefined;
    $('.article-meta-item').each((_, li) => {
      const label = $(li).text();
      const minutesMatch = $(li).find('b').text().match(/\d+/);
      const minutes = minutesMatch ? parseInt(minutesMatch[0], 10) : undefined;
      if (/Előkészítési/.test(label)) prepTime = minutes;
      else if (/Elkészítési/.test(label)) cookTime = minutes;
    });

    const notes = $('h2.lead').first().text().trim() || undefined;

    const imageUrls: string[] = [];
    const coverImage = $('.receptfoto img').first().attr('src');
    if (coverImage) imageUrls.push(coverImage);

    // Only "-light" tags are real content tags; the site's own category link
    // ("Receptek") shares the list but uses a plain "cimke-rovat" class.
    const tags: string[] = [];
    $('.cikk-cimkek-list a.cimke-rovat-light').each((_, a) => {
      const name = $(a).text().trim().toLowerCase();
      if (name && !tags.includes(name)) tags.push(name);
    });

    return {
      title,
      sourceUrl: url,
      ingredients,
      instructions,
      prepTime,
      cookTime,
      notes,
      imageUrls,
      tags,
      isFallback: false,
    };
  },
};

export default parser;
