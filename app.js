const express = require('express');
const path = require('path');
const app = express();
const api = require('./routes/api');

// Load View Engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Set Public Folder
app.use(express.static(path.join(__dirname, 'public')));
// Api routing
app.use('/api', api);
// Landing page
app.get('/', (req, res) => {
  res.render('home');
});

app.listen('3000', () => {
  console.log('Server up and running on port 3000');
});
