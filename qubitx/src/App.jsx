import React from "react";
import "./styles/globals.css";
import Home from "./pages/Home";
import QubitXHero from "./components/Layout/QubitXHero";

export default function App() {
  // Hero fills the first viewport; Home (AppLayout) is directly below it.
  return (
    <>
      <QubitXHero />
      <Home />
    </>
  );
}
