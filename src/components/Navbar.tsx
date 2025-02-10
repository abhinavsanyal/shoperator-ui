import { UserButton } from "@clerk/clerk-react";
import "./Navbar.css";

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h1>Shoperator</h1>
      </div>
      <div className="navbar-menu">
        <UserButton />
      </div>
    </nav>
  );
}
