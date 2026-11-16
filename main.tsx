import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/chakra-petch/latin-500.css';
import '@fontsource/chakra-petch/latin-600.css';
import '@fontsource/chakra-petch/latin-700.css';
import '@fontsource/exo-2/latin-400.css';
import '@fontsource/exo-2/latin-500.css';
import '@fontsource/exo-2/latin-600.css';
import '@fontsource/exo-2/latin-700.css';
import './index.css';
import { App } from './App';
import { initPhaser } from './game__phaser';
import { useApp } from './store__app';
import { installViewportGuards } from './game__viewport';

installViewportGuards();

document.fonts?.load('700 20px "Exo 2"').finally(() => {
  initPhaser(document.getElementById('game')!, useApp.getState().prefs.quality);
  createRoot(document.getElementById('root')!).render(<App />);
});
