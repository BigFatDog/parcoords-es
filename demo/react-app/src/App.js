import React from 'react';
import Chart from './chart';
import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
      </header>
        <Chart/>
    </div>
  );
}

export default App;
