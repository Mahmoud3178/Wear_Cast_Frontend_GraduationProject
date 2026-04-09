const https = require('https');

https.get('https://wear-cast.runasp.net/openapi/v1.json', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const swagger = JSON.parse(data);
      const paths = Object.keys(swagger.paths);
      console.log("ALL PATHS:");
      paths.forEach(p => console.log(p));
    } catch (e) {
      console.error(e.message);
    }
  });
}).on('error', (e) => {
  console.error(e);
});
