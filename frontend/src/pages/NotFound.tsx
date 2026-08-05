/**
 * NotFound page — 404 fallback.
 * @module pages/NotFound
 */

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="w-20 h-20 rounded-3xl bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center mx-auto mb-6">
          <Compass className="w-10 h-10 text-brand-500" />
        </div>
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-2">404</h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-6">Page not found</p>
        <Button onClick={() => navigate('/')}>Back to Home</Button>
      </motion.div>
    </div>
  );
}
