/**
 * Landing page — marketing/hero page for the application.
 * @module pages/Landing
 */

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Search, Lock, Cloud, ArrowRight, CheckCircle2 } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '../utils/constants';
import { useAuth } from '../hooks/useAuth';

const FEATURES = [
  {
    icon: Lock,
    title: 'Client-Side Encryption',
    desc: 'AES-256-GCM encryption happens in your browser. Your password never touches the server.',
  },
  {
    icon: Search,
    title: 'Semantic Search',
    desc: 'AI-powered search by meaning, not keywords. Find files by describing what they contain.',
  },
  {
    icon: Shield,
    title: 'Zero-Knowledge',
    desc: 'The server cannot read your files, filenames, or search queries. True end-to-end privacy.',
  },
  {
    icon: Cloud,
    title: 'Cloud Storage',
    desc: 'Secure, scalable storage with vector similarity search powered by pgvector.',
  },
];

export function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-brand-50 dark:from-gray-950 dark:via-gray-900 dark:to-brand-950/20">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 lg:px-12 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900 dark:text-white">{APP_NAME}</span>
        </div>
        <button
          onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
          className="btn-primary"
        >
          {isAuthenticated ? 'Dashboard' : 'Get Started'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 lg:px-12 pt-20 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-900 mb-6">
            <Shield className="w-3.5 h-3.5 text-brand-500" />
            <span className="text-sm text-brand-700 dark:text-brand-300 font-medium">
              Zero-Knowledge Architecture
            </span>
          </div>

          <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight text-balance">
            Your files,{' '}
            <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
              encrypted
            </span>
            ,<br />
            searchable, private.
          </h1>

          <p className="mt-6 text-lg lg:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-balance">
            {APP_TAGLINE}. Upload files that are encrypted in your browser, then
            find them with AI-powered semantic search — without trusting the server.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/register')}
              className="btn-primary text-base px-6 py-3"
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Create Free Account'}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="btn-secondary text-base px-6 py-3"
            >
              Sign In
            </button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> No credit card
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> Open source
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> End-to-end encrypted
            </span>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 lg:px-12 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                className="glass-card p-6"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-brand-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">{feature.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>© 2026 {APP_NAME}. Built with zero-knowledge principles.</p>
      </footer>
    </div>
  );
}
