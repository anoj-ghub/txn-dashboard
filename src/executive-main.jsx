import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/manrope';
import Executive from './Executive.jsx';
import './executive.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><Executive /></React.StrictMode>);
