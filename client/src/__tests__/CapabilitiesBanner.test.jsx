import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CapabilitiesBanner } from '../components/layout/CapabilitiesBanner';
import http from '../api/http';
import * as AuthContext from '../context/useAuth';

vi.mock('../api/http');
vi.mock('../context/useAuth');

describe('CapabilitiesBanner Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when user is not authenticated', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ user: null });
    const { container } = render(<CapabilitiesBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders demo mode warning and simulated badges when mock subsystems are active', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 1, role: 'candidate', name: 'Test User' },
    });

    http.get.mockResolvedValueOnce({
      data: {
        aiProvider: 'mock',
        executionProvider: 'mock',
        redis: 'in-memory',
      },
    });

    render(<CapabilitiesBanner />);

    await waitFor(() => {
      expect(screen.getByText(/Demonstration Mode Active:/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Simulated AI/i)).toBeInTheDocument();
    expect(screen.getByText(/Simulated Code Execution/i)).toBeInTheDocument();
    expect(screen.getByText(/In-Memory Redis/i)).toBeInTheDocument();
  });

  it('dismisses banner when close button is clicked', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 1, role: 'candidate', name: 'Test User' },
    });

    http.get.mockResolvedValueOnce({
      data: {
        aiProvider: 'mock',
        executionProvider: 'mock',
        redis: 'in-memory',
      },
    });

    render(<CapabilitiesBanner />);

    await waitFor(() => {
      expect(screen.getByText(/Demonstration Mode Active:/i)).toBeInTheDocument();
    });

    const closeBtn = screen.getByLabelText(/Dismiss demo mode warning banner/i);
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/Demonstration Mode Active:/i)).not.toBeInTheDocument();
  });
});
