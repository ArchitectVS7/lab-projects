import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DomainPicker from '../DomainPicker';
import type { Domain } from '../../types';

const mockDomains: Domain[] = [
  { id: '1', name: 'Coding', color: '#3b82f6', icon: '💻', userId: 'u1', sortOrder: 0, createdAt: '' },
  { id: '2', name: 'Health', color: '#22c55e', icon: '🏃', userId: 'u1', sortOrder: 1, createdAt: '' },
];

describe('DomainPicker', () => {
  it('renders domain chips with icon and name', () => {
    const onChange = vi.fn();
    render(<DomainPicker selected={[]} onChange={onChange} domains={mockDomains} />);

    expect(screen.getByText('💻')).toBeDefined();
    expect(screen.getByText('Coding')).toBeDefined();
    expect(screen.getByText('🏃')).toBeDefined();
    expect(screen.getByText('Health')).toBeDefined();
  });

  it('clicking an unselected chip calls onChange with that domain ID added', () => {
    const onChange = vi.fn();
    render(<DomainPicker selected={[]} onChange={onChange} domains={mockDomains} />);

    const codingButton = screen.getByText('Coding').closest('button')!;
    fireEvent.click(codingButton);

    expect(onChange).toHaveBeenCalledWith(['1']);
  });

  it('clicking a selected chip calls onChange with that domain ID removed', () => {
    const onChange = vi.fn();
    render(<DomainPicker selected={['1']} onChange={onChange} domains={mockDomains} />);

    const codingButton = screen.getByText('Coding').closest('button')!;
    fireEvent.click(codingButton);

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('selected chips have aria-pressed=true, unselected chips have aria-pressed=false', () => {
    const onChange = vi.fn();
    render(<DomainPicker selected={['1']} onChange={onChange} domains={mockDomains} />);

    const codingButton = screen.getByText('Coding').closest('button')!;
    const healthButton = screen.getByText('Health').closest('button')!;

    expect(codingButton.getAttribute('aria-pressed')).toBe('true');
    expect(healthButton.getAttribute('aria-pressed')).toBe('false');
  });

  it('shows empty message when no domains provided', () => {
    const onChange = vi.fn();
    render(<DomainPicker selected={[]} onChange={onChange} domains={[]} />);

    expect(screen.getByText('No domains available.')).toBeDefined();
  });

  it('multiple domains can be selected simultaneously', () => {
    const onChange = vi.fn();
    render(<DomainPicker selected={['1']} onChange={onChange} domains={mockDomains} />);

    const healthButton = screen.getByText('Health').closest('button')!;
    fireEvent.click(healthButton);

    expect(onChange).toHaveBeenCalledWith(['1', '2']);
  });
});
