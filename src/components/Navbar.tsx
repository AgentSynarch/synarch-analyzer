import React from "react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

interface NavItem {
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { label: "agents", href: "/agents" },
  { label: "forks", href: "/forks" },
  { label: "docs", href: "/docs" },
  { label: "x", href: "/x" },
];

export const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-6 flex items-center justify-between h-14">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img src={logo} alt="Synarch logo" className="w-14 h-14 object-contain" />
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors tracking-wider"
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/launch"
            className="font-mono text-xs border border-primary text-primary px-4 py-1.5 hover:bg-primary hover:text-primary-foreground transition-all duration-200"
          >
            launch agent
          </Link>
        </div>
      </div>
    </nav>
  );
};
