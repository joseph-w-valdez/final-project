import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import SubNavbar from './components/Sub-Navbar';

import Navbar from './components/Navbar';

import Home from './pages/Home';
import Character from './pages/Character';

function App() {
  const [characterData, setCharacterData] = useState(undefined);
  const [subNavbarText, setSubNavBarText] = useState('SEARCH');

  return (
    <div className="App">
      <Navbar />
      <div className="mt-14">
        <SubNavbar subNavbarText={subNavbarText} setSubNavBarText={setSubNavBarText} />
        <Routes>
          <Route path="/" element={<Home setCharacterData={setCharacterData} setSubNavBarText={setSubNavBarText} />} />
          <Route path="/character" element={<Character characterData={characterData} setSubNavBarText={setSubNavBarText} />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;