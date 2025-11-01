"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { name: "Home", path: "/" },
  { name: "Dashboard", path: "/dashboard" },
  { name: "Trader", path: "/trader" },
  { name: "Copytrade", path: "/copytrade" },
  { name: "Profile", path: "/profile" },
  { name: "About", path: "/about" },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between py-3 px-4">
        <Link href="/" className="text-xl font-bold text-indigo-400">
          Anthé Labs
        </Link>
        <div className="flex gap-5">
          {links.map((l) => (
            <Link
              key={l.path}
              href={l.path}
              className={`text-sm transition-colors hover:text-indigo-400 ${
                pathname === l.path
                  ? "text-indigo-400 font-semibold"
                  : "text-zinc-400"
              }`}
            >
              {l.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
