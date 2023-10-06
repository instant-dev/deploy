require('dotenv').config({path: '.test.env'});
const fs = require('fs');

describe('Test Suite', function() {

  let testFilenames = fs.readdirSync('./test/tests');
  testFilenames.forEach(filename => require(`./tests/${filename}`)());

});
