const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

const regexFixes = [
  [/u an ofiste/g, 'şu an ofiste'],
  [/u An Ofiste/g, 'Şu An Ofiste'],
  [/Izinli/g, 'İzinli'],
  [/Ge Kalan/g, 'Geç Kalan'],
  [/Ge kalan/g, 'Geç kalan'],
  [/A Durumu/g, 'Ağ Durumu'],
  [/Gvenlik/g, 'Güvenlik']
];

let replaced = 0;
for (const [regex, to] of regexFixes) {
  const matches = c.match(regex);
  if (matches) {
    c = c.replace(regex, to);
    console.log(`Fixed: ${regex} -> '${to}' (${matches.length}x)`);
    replaced += matches.length;
  }
}

fs.writeFileSync('src/App.tsx', c, 'utf8');
console.log('Total fixed:', replaced);
