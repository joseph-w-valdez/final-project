import React from 'react';
import CharacterSearch from '../components/CharacterSearch';

export default function Home({ setCharacterData, onMount }) {

  onMount();

  return (
    <div>
      <CharacterSearch setCharacterData={setCharacterData} />
    </div>
  );
}
