import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import PageBackground from '../layouts/PageBackground.jsx';

function AuthCard({ title, subtitle, children, footerText, footerLink, footerLinkText }) {
  return (
    <main className="auth-page">
      <PageBackground />
      <section className="auth-card" aria-labelledby="auth-heading">
        <Link to="/" className="brand-mark">
          <span className="brand-icon" aria-hidden="true"><Sparkles size={17} strokeWidth={2.25} /></span>
          AI Interview Coach
        </Link>
        <h1 id="auth-heading">{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>
        {children}
        {footerText && (
          <p className="auth-footer">
            {footerText} <Link to={footerLink}>{footerLinkText}</Link>
          </p>
        )}
      </section>
    </main>
  );
}

export default AuthCard;
