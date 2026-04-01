import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Callback from "./pages/Callback";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth/callback" element={<Callback />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
