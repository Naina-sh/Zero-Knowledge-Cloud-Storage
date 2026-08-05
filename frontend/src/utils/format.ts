/**
 * Utility functions for formatting and file type detection.
 * @module utils/format
 */

import type { FileType } from '../types';

/**
 * Format bytes into a human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Format a date string into a readable format.
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date string with time.
 */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Relative time (e.g., "2 hours ago").
 */
export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  const intervals: Array<[number, string]> = [
    [31536000, 'year'],
    [2592000, 'month'],
    [604800, 'week'],
    [86400, 'day'],
    [3600, 'hour'],
    [60, 'minute'],
  ];

  for (const [secondsInUnit, unit] of intervals) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
}

/**
 * Determine the file type from a filename.
 */
export function getFileType(filename: string): FileType {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'pdf';
    case 'docx':
    case 'doc':
      return 'docx';
    case 'txt':
      return 'txt';
    case 'md':
      return 'md';
    case 'csv':
      return 'csv';
    case 'json':
      return 'json';
    default:
      return 'unknown';
  }
}

/**
 * Get an emoji/icon label for a file type.
 */
export function getFileTypeIcon(type: FileType): string {
  switch (type) {
    case 'pdf':
      return '📕';
    case 'docx':
      return '📘';
    case 'txt':
      return '📄';
    case 'md':
      return '📝';
    case 'csv':
      return '📊';
    case 'json':
      return '🔧';
    default:
      return '📎';
  }
}

/**
 * Truncate a string with ellipsis.
 */
export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + '...';
}

/**
 * Convert a similarity score (0-1) to a percentage string.
 */
export function scoreToPercentage(score: number): string {
  return `${Math.round(score * 100)}%`;
}
