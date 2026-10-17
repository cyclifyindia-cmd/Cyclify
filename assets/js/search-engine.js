(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CyclifySearchEngine = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const aliases = { tires:'tyre', tyres:'tyre', tire:'tyre', bicycles:'bike', bicycle:'bike', bikes:'bike', wheels:'wheel', frames:'frame', framesets:'frameset', helmets:'helmet', trainers:'trainer', pedals:'pedal', sunglasses:'sunglass', colango:'colnago', bass:'basso', igps:'igpsport' };
  function normalise(value) {
    return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/(\d)\s*[×*]\s*(?=\d)/g,'$1x').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  }
  const words = value => normalise(value).split(' ').filter(Boolean).map(word => aliases[word] || word);
  function createIndex(products) {
    const seen = new Set();
    const entries = products.filter(p => p && p.id != null && p.name && !seen.has(String(p.id)) && seen.add(String(p.id))).map(product => {
      const name = normalise(product.name), nameWords = words(product.name);
      const tokens = [...new Set(words([product.name, product.brand, product.category, product.keywords].join(' ')))];
      return { product, name, nameWords, compact:name.replace(/ /g,''), plain:name.replace(/\band\b/g,'').replace(/ /g,''), tokens, all:tokens.join(' ').replace(/ /g,'') };
    });
    return { entries, vocabulary:[...new Set(entries.flatMap(entry => entry.tokens))] };
  }
  function score(entry, queryWords, query) {
    const compact = query.replace(/ /g,'');
    if (entry.compact === compact || entry.plain === compact) return 2000;
    let points = entry.name === query ? 1400 : entry.name.includes(query) ? 800 : (entry.compact.includes(compact)||entry.plain.includes(compact)) ? 650 : 0;
    for (const word of queryWords) {
      if (entry.nameWords.includes(word)) points += 100;
      else if (entry.tokens.includes(word)) points += 55;
      else if (entry.nameWords.some(token => token.startsWith(word))) points += 65;
      else if (entry.tokens.some(token => token.startsWith(word))) points += 25;
      else if ((word.length >= 4 || /\d/.test(word)) && (entry.compact.includes(word)||entry.plain.includes(word))) points += 48;
      else if ((word.length >= 4 || /\d/.test(word)) && entry.all.includes(word)) points += 12;
      else return 0;
    }
    return points;
  }
  function distance(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 3;
    const rows = Array.from({length:a.length+1}, () => []);
    for(let i=0;i<=a.length;i++) rows[i][0]=i;
    for(let j=0;j<=b.length;j++) rows[0][j]=j;
    for(let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++) {
      rows[i][j]=Math.min(rows[i-1][j]+1,rows[i][j-1]+1,rows[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
      if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1]) rows[i][j]=Math.min(rows[i][j],rows[i-2][j-2]+1);
    }
    return rows[a.length][b.length];
  }
  function ranked(index, queryWords) {
    const query=queryWords.join(' ');
    return index.entries.map(entry=>({entry,points:score(entry,queryWords,query)})).filter(item=>item.points>0).sort((a,b)=>b.points-a.points||Number(a.entry.product.available===false)-Number(b.entry.product.available===false)||a.entry.product.name.localeCompare(b.entry.product.name)).map(item=>item.entry.product);
  }
  function search(index, input) {
    const query = normalise(input).slice(0,180), queryWords=words(query);
    if(!queryWords.length) return {items:[],total:0,query,correctedQuery:null};
    let items=ranked(index,queryWords), correctedQuery=null;
    if(!items.length) {
      let changed=false;
      const corrected=queryWords.map(word=>{
        if(word.length<4||/\d/.test(word)||index.vocabulary.includes(word)) return word;
        const candidates=index.vocabulary.filter(token=>token[0]===word[0]&&Math.abs(token.length-word.length)<=1).map(token=>({token,edit:distance(word,token)})).filter(item=>item.edit<=1).sort((a,b)=>a.edit-b.edit||a.token.length-b.token.length);
        if(!candidates.length) return word;
        changed=true;return candidates[0].token;
      });
      if(changed){items=ranked(index,corrected);if(items.length)correctedQuery=corrected.join(' ');}
    }
    return {items,total:items.length,query,correctedQuery};
  }
  return {createIndex,search,normalise};
});
