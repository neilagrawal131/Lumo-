import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Mail } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-soft">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Learn smarter with AI-generated flashcards, quizzes, and study guides — built for every kind of learner.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Product</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground">Features</a></li>
              <li><a href="#how" className="hover:text-foreground">How it works</a></li>
              <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
              <li><Link to="/auth" className="hover:text-foreground">Sign in</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Learn</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground">Flashcards</a></li>
              <li><a href="#features" className="hover:text-foreground">Quizzes</a></li>
              <li><a href="#features" className="hover:text-foreground">Study guides</a></li>
              <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Contact</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> hello@lumo.study
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-sm text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Lumo. All rights reserved.</p>
          <p>Made for curious minds ✨</p>
        </div>
      </div>
    </footer>
  );
}
