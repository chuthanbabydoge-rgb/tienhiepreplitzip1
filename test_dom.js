const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('tienhiepv3.html', 'utf-8');

const virtualConsole = new (require('jsdom')).VirtualConsole();
virtualConsole.on("error", (e) => {
  console.error("JSDOM Error: ", e.message || e);
});
virtualConsole.on("jsdomError", (e) => {
  console.error("JSDOM jsdomError: ", e.message || e);
});
virtualConsole.on("log", (msg) => {
  console.log("JSDOM Log: ", msg);
});

try {
  const dom = new JSDOM(html, { runScripts: "dangerously", virtualConsole });
  console.log("Parsed DOM successfully.");
} catch(e) {
  console.error("Fatal Error:", e);
}
