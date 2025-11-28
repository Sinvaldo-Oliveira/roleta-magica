import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Campaign from "@/pages/Campaign";
import Dashboard from "@/pages/Dashboard";
import ClientRegister from "@/pages/ClientRegister";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/c/:slug" element={<Campaign />} />
        <Route path="/cadastro-cliente/:slug" element={<ClientRegister />} />
        <Route path="/other" element={<div className="text-center text-xl">Other Page - Coming Soon</div>} />
      </Routes>
    </Router>
  );
}
