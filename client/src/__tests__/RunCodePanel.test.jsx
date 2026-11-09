import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RunCodePanel } from '../features/room/RunCodePanel';
import http from '../api/http';

vi.mock('../api/http');

const mockQuestions = [
  {
    id: 1,
    title: 'Two Sum Problem',
    statement: 'Given an array of integers, return indices of two numbers that add up to target.',
    domain: 'DSA',
    difficulty: 'intermediate',
    type: 'coding',
    sampleTestCases: [{ input: '[2, 7, 11, 15], target = 9', expectedOutput: '[0, 1]' }],
  },
];

describe('RunCodePanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders question details, sample test cases and ready state', async () => {
    http.get.mockResolvedValueOnce({ data: { questions: mockQuestions } });

    render(
      <RunCodePanel
        getCode={() => 'function twoSum() {}'}
        language="javascript"
        isObserver={false}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Two Sum Problem')).toBeInTheDocument();
    });

    expect(screen.getByText('Ready to execute')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Run Code/i })).toBeInTheDocument();
  });

  it('triggers execution, polls submission, and displays simulated result & test results', async () => {
    http.get.mockImplementation((url) => {
      if (url === '/questions') {
        return Promise.resolve({ data: { questions: mockQuestions } });
      }
      if (url.startsWith('/submissions/sub-123')) {
        return Promise.resolve({
          data: {
            submission: {
              id: 'sub-123',
              status: 'completed',
              resultStatus: 'accepted',
              passedTests: 2,
              totalTests: 2,
              executionTimeMs: 42,
              memoryKb: 1024,
              provider: 'mock',
              isSimulated: true,
              testResults: [
                {
                  isHidden: false,
                  input: '[2, 7], 9',
                  expectedOutput: '[0, 1]',
                  actualOutput: '[0, 1]',
                  passed: true,
                  executionTimeMs: 20,
                },
                {
                  isHidden: true,
                  passed: true,
                  executionTimeMs: 22,
                },
              ],
            },
          },
        });
      }
      return Promise.reject(new Error('not found'));
    });

    http.post.mockResolvedValueOnce({
      data: { submission: { id: 'sub-123', status: 'queued' } },
    });

    render(
      <RunCodePanel
        getCode={() => 'function twoSum() { return [0, 1]; }'}
        language="javascript"
        isObserver={false}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Two Sum Problem')).toBeInTheDocument();
    });

    const runBtn = screen.getByRole('button', { name: /Run Code/i });
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getByText(/Simulated result/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/2 \/ 2/i)).toBeInTheDocument();
    expect(screen.getByText(/42 ms/i)).toBeInTheDocument();
    expect(screen.getByText(/Sample Test Case #1/i)).toBeInTheDocument();
    expect(screen.getByText(/Hidden Test Case #2/i)).toBeInTheDocument();
    expect(screen.getByText(/Secret Data Redacted/i)).toBeInTheDocument();
  });
});
