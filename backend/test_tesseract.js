const Tesseract = require('tesseract.js');
const fs = require('fs');

async function test() {
  const worker = await Tesseract.createWorker('eng');
  
  // create dummy image
  // wait we don't have an image, let's just make a white image or grab one from somewhere
  
}
test().catch(console.error);
