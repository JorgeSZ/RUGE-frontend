// Script que genera environment.production.ts desde variables de entorno
// Se ejecuta antes del build en Vercel
const fs = require('fs');
const path = require('path');

const apiUrl      = process.env.API_URL      || 'https://rugeapi-production.up.railway.app/api';
const baseUrl     = process.env.BASE_URL     || 'https://ruge-frontend.vercel.app';
const checkinPin  = process.env.CHECKIN_PIN  || '1234';
const r2PublicUrl = process.env.R2_PUBLIC_URL|| 'https://pub-871cfbe0eb2f4139a30018e262daca76.r2.dev';

const content = `export const environment = {
  production: true,
  apiUrl: '${apiUrl}',
  baseUrl: '${baseUrl}',
  checkinPin: '${checkinPin}',
  r2PublicUrl: '${r2PublicUrl}'
};
`;

const targetPath = path.join(__dirname, '..', 'src', 'environments', 'environment.production.ts');
fs.writeFileSync(targetPath, content);
console.log('environment.production.ts generado:');
console.log(content);
