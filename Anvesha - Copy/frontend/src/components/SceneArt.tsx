import { useState, useMemo } from 'react';
import { getExperienceImage } from '../data/experienceImages';

/**
 * Experience image component.
 * Displays authentic photography with lazy loading, semantic alt text,
 * and reliable inline SVG placeholder fallback if an image fails to load.
 */
const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const placeholder = (label: string) => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FDE7D3"/><stop offset="1" stop-color="#F6C3D3"/></linearGradient></defs>` +
    `<rect width="400" height="260" fill="url(#g)"/>` +
    `<text x="200" y="136" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" fill="#6B4A55">${escapeXml(label.slice(0, 40))}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export function SceneArt({
  image,
  className = '',
  alt = '',
}: {
  image?: string;
  className?: string;
  alt?: string;
}) {
  const [hasError, setHasError] = useState(false);

  const resolved = useMemo(() => {
    // 1. Direct image provided
    if (image && !hasError) {
      // Find semantic alt text if alt is missing or short
      const match = getExperienceImage(image, alt);
      return {
        src: image,
        altText: alt || match?.alt || 'Travel experience',
      };
    }

    // 2. No image provided, try resolving by alt/label
    if (alt && !hasError) {
      const match = getExperienceImage(alt, alt);
      if (match) {
        return {
          src: match.src,
          altText: match.alt,
        };
      }
    }

    // 3. Fallback placeholder
    return {
      src: placeholder(alt || 'Experience'),
      altText: alt || 'Experience visual representation',
    };
  }, [image, alt, hasError]);

  return (
    <img
      src={resolved.src}
      alt={resolved.altText}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (!hasError) setHasError(true);
      }}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
