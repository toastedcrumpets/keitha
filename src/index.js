import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import reportWebVitals from './reportWebVitals';
import $ from "jquery";

import '@fortawesome/fontawesome-free/css/all.css';

import './index.css';

//Expose jquery to all scripts
window.jQuery = $;
window.$ = $;


ReactDOM.render(
  //Can't run in strict mode, thanks to react-bootstrap!
  //<React.StrictMode>
  <App />
  //</React.StrictMode>
  ,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
