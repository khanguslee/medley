import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ActivityProvider } from "./context/ActivityContext";
import Nav from "./components/Nav";
import Home from "./pages/Home";
import Callback from "./pages/Callback";
import Dashboard from "./pages/Dashboard";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <ActivityProvider>
        <Nav />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth/callback" element={<Callback />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </ActivityProvider>
    </BrowserRouter>
  );
}

export default App;
