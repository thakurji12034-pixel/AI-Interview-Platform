import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportView } from '../features/reports/ReportView';
import http from '../api/http';
import * as AuthContext from '../context/useAuth';

vi.mock('../api/http');
vi.mock('../context/useAuth');
vi.mock('react-router-dom', () => ({
  useParams: () => ({ sessionId: '10' }),
  useNavigate: () => vi.fn(),
}));
vi.mock('../context/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockReport = {
  id: 1,
  sessionId: 10,
  candidateId: 2,
  aiEvaluationScore: 84.5,
  codeExecutionSummary: {
    totalSubmissions: 2,
    passedTests: 4,
    totalTests: 4,
    acceptanceRate: 100,
  },
  verifiedTimings: {
    totalTimeSpentSeconds: 1800,
  },
  humanOverride: null,
  overallRecommendations: ['Deepen memory profiling knowledge', 'Study distributed systems consensus'],
  disclaimer: 'AI-generated evaluation. Reviewed by a human interviewer before final decision.',
};

describe('ReportView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders overall score, dimensions, strengths, and visible AI disclaimer', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 2, role: 'candidate' },
    });

    http.get.mockResolvedValueOnce({
      data: { report: mockReport },
    });

    render(<ReportView sessionId="10" />);

    await waitFor(() => {
      expect(screen.getByText('84.5')).toBeInTheDocument();
    });

    expect(screen.getByText(/Overall Composite Score/i)).toBeInTheDocument();
    expect(screen.getByText(/Problem Solving & Algorithm Design/i)).toBeInTheDocument();
    expect(screen.getByText(/Demonstrated Strengths/i)).toBeInTheDocument();
    expect(screen.getByText(/Targeted Practice Recommendations/i)).toBeInTheDocument();
    expect(screen.getByText(/Deepen memory profiling knowledge/i)).toBeInTheDocument();
    expect(screen.getByText(/Visible AI Advisory Disclaimer/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Reviewed by a human interviewer before final decision/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Simulated result \(Mock AI\)/i)).toBeInTheDocument();
  });

  it('renders human override form and allows interviewer to record adjustment', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 3, role: 'interviewer' },
    });

    http.get.mockResolvedValue({
      data: { report: mockReport },
    });
    http.post.mockResolvedValueOnce({
      data: { success: true },
    });

    render(<ReportView sessionId="10" />);

    await waitFor(() => {
      expect(screen.getByText('84.5')).toBeInTheDocument();
    });

    expect(screen.getByText(/Human Interviewer Override & Scoring/i)).toBeInTheDocument();

    const scoreInput = screen.getByPlaceholderText(/e\.g\. 88/i);
    const notesInput = screen.getByPlaceholderText(/Reasoning for score adjustment/i);
    const submitBtn = screen.getByRole('button', { name: /Save Human Override/i });

    fireEvent.change(scoreInput, { target: { value: '92' } });
    fireEvent.change(notesInput, { target: { value: 'Exceptional answers on data structures' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(http.post).toHaveBeenCalledWith(
        '/evaluations/1/override',
        expect.objectContaining({
          overrideScore: 92,
          humanNotes: 'Exceptional answers on data structures',
        })
      );
    });
  });
});
