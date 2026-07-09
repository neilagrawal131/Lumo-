import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Mail } from "lucide-react";
import { SUPPORT_EMAIL } from "@/lib/support";

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
              <li><Link to="/help" className="hover:text-foreground">Help &amp; FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Support</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/help" className="hover:text-foreground">Help center</Link></li>
              <li>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-2 hover:text-foreground">
                  <Mail className="h-4 w-4" /> {SUPPORT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-sm text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Etude. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <span className="hidden md:inline">Made for curious minds ✨</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
