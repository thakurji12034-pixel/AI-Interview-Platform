import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResumeUploadModal } from '../features/resume/ResumeUploadModal';
import http from '../api/http';

vi.mock('../api/http');
vi.mock('../context/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('ResumeUploadModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<ResumeUploadModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders PDF upload modal elements when open', () => {
    render(<ResumeUploadModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText(/PDF Resume Skill Extraction & Job Match/i)).toBeInTheDocument();
    expect(screen.getByText(/Strictly .pdf format up to 5 MB/i)).toBeInTheDocument();
    expect(screen.getByText(/Job Description Match Analyzer/i)).toBeInTheDocument();
  });

  it('calculates job match score and displays matched vs missing skills', async () => {
    http.post.mockResolvedValueOnce({
      data: {
        matchScore: 80,
        totalRequired: 5,
        matchedCount: 4,
        matchedSkills: ['JavaScript', 'React', 'Node.js', 'Docker'],
        missingSkills: ['Kubernetes'],
        advisoryNote: 'Deterministic skill overlap estimate',
      },
    });

    render(<ResumeUploadModal isOpen={true} onClose={vi.fn()} />);

    const textarea = screen.getByPlaceholderText(/Paste job description text here/i);
    fireEvent.change(textarea, { target: { value: 'Looking for React, Node, Docker and Kubernetes skills' } });

    const matchBtn = screen.getByRole('button', { name: /Analyze Match Score/i });
    fireEvent.click(matchBtn);

    await waitFor(() => {
      expect(screen.getByText('80%')).toBeInTheDocument();
    });

    expect(screen.getByText(/4 of 5 skills matched/i)).toBeInTheDocument();
    expect(screen.getByText('Kubernetes')).toBeInTheDocument();
    expect(screen.getByText(/Deterministic skill overlap estimate/i)).toBeInTheDocument();
  });
});
