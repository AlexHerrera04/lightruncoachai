import React, { useEffect } from 'react';
import Router from './router.jsx';

function App() {

  useEffect(() => {
    const saved = localStorage.getItem("darkMode") === "true";
    if (saved) {
      document.body.classList.add("dark");
    }
  }, []);

  return <Router />;
}

export default App;

