import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '../src/index.css';
import '../src/preview/season-preview.css';
import SeasonPreview from '../src/preview/SeasonPreview';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><SeasonPreview /></BrowserRouter></React.StrictMode>,
);
