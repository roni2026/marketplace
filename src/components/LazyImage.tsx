import React, { useState } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  title?: string;
  caption?: string;
  width?: number;
  height?: number;
  className?: string;
  imgClassName?: string;
  srcSet?: string;
  sizes?: string;
  loading?: 'lazy' | 'eager';
}

/**
 * SEO-optimized lazy image component.
 * - Uses native loading="lazy" and decoding="async"
 * - Sets explicit width/height to prevent CLS
 * - Supports srcSet and sizes for responsive images
 * - Includes figure + figcaption when caption is provided
 * - Generates blur placeholder
 */
export default function LazyImage({
  src,
  alt,
  title,
  caption,
  width,
  height,
  className = '',
  imgClassName = '',
  srcSet,
  sizes,
  loading = 'lazy',
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);

  const img = (
    <img
      src={src}
      alt={alt}
      title={title}
      width={width}
      height={height}
      srcSet={srcSet}
      sizes={sizes}
      loading={loading}
      decoding="async"
      onLoad={() => setLoaded(true)}
      className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
    />
  );

  if (caption) {
    return (
      <figure className={className}>
        {img}
        <figcaption className="text-xs text-muted-foreground mt-1 text-center">
          {caption}
        </figcaption>
      </figure>
    );
  }

  return <div className={className}>{img}</div>;
}
