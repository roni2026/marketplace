// BazarBD — Phase 2: Component tests
// src/components/profile/__tests__/TrustScoreBadge.test.tsx
//
// Run with: npx vitest run

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrustScoreBadge } from '@/components/profile/TrustScoreBadge';

describe('TrustScoreBadge', () => {
  it('renders the score value', () => {
    render(<TrustScoreBadge score={85} />);
    expect(screen.getByText('85')).toBeDefined();
  });

  it('shows label when showLabel is true', () => {
    render(<TrustScoreBadge score={85} showLabel={true} />);
    expect(screen.getByText(/Excellent/)).toBeDefined();
  });

  it('hides label when showLabel is false', () => {
    const { container } = render(<TrustScoreBadge score={85} showLabel={false} />);
    expect(container.textContent).toContain('85');
    expect(container.textContent).not.toContain('Excellent');
  });

  it('applies green styling for high scores', () => {
    const { container } = render(<TrustScoreBadge score={90} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('green');
  });

  it('applies red styling for low scores', () => {
    const { container } = render(<TrustScoreBadge score={10} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('red');
  });

  it('rounds decimal scores', () => {
    render(<TrustScoreBadge score={85.7} />);
    expect(screen.getByText('86')).toBeDefined();
  });
});
