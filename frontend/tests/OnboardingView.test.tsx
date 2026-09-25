import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import OnboardingView from '../src/components/OnboardingView';
import { apiClient } from '../src/api/client';

// Mock the API client
vi.mock('../src/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  }
}));

// Mock react-router-dom useParams to test Detail View easily
const mockUseParams = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => mockUseParams(),
  };
});

describe('OnboardingView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({});
  });

  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
  };

  it('1. Loading state for Onboarding list', () => {
    (apiClient.get as any).mockImplementation(() => new Promise(() => {})); // Never resolves
    renderWithRouter(<OnboardingView />);
    expect(screen.getByText(/Loading plans.../i)).toBeInTheDocument();
  });

  it('2. Empty plans state', async () => {
    (apiClient.get as any).mockResolvedValue({ data: { data: [] } });
    renderWithRouter(<OnboardingView />);
    
    await waitFor(() => {
      expect(screen.getByText(/No onboarding plans found/i)).toBeInTheDocument();
    });
  });

  it('3. Plan cards render correctly', async () => {
    (apiClient.get as any).mockResolvedValue({
      data: {
        data: [{
          _id: 'plan-1',
          title: 'Cloud Migration Onboarding',
          status: 'ACTIVE',
          progress: 25,
          designationId: { title: 'Backend Engineer' }
        }]
      }
    });

    renderWithRouter(<OnboardingView />);
    
    await waitFor(() => {
      expect(screen.getByText('Cloud Migration Onboarding')).toBeInTheDocument();
      expect(screen.getByText('ACTIVE')).toBeInTheDocument();
      expect(screen.getByText('Role target: Backend Engineer')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
    });
  });

  it('4. Plan detail renders & 5. Progress renders correctly', async () => {
    mockUseParams.mockReturnValue({ planId: 'plan-1' });
    
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes('next-action')) {
        return Promise.resolve({ data: { nextAction: null, reason: 'ONBOARDING_COMPLETED' } });
      }
      return Promise.resolve({
        data: {
          data: {
            _id: 'plan-1',
            title: 'Detail View Plan',
            status: 'ACTIVE',
            progress: 50,
            modules: []
          }
        }
      });
    });

    renderWithRouter(<OnboardingView />);

    await waitFor(() => {
      expect(screen.getByText('Detail View Plan')).toBeInTheDocument();
      // Test progress rendering
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  it('6. Next-action API renders current action', async () => {
    mockUseParams.mockReturnValue({ planId: 'plan-1' });
    
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes('next-action')) {
        return Promise.resolve({
          data: {
            nextAction: { taskId: 't1', title: 'Learn Kubernetes', type: 'LEARNING' },
            reason: 'IN_PROGRESS'
          }
        });
      }
      return Promise.resolve({
        data: {
          data: { _id: 'plan-1', title: 'Test Plan', status: 'ACTIVE', progress: 0, modules: [] }
        }
      });
    });

    renderWithRouter(<OnboardingView />);

    await waitFor(() => {
      expect(screen.getByText('Next Action')).toBeInTheDocument();
      expect(screen.getByText('[Learn Kubernetes]')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Complete Task/i })).toBeInTheDocument();
    });
  });

  it('7. Task completion triggers refresh', async () => {
    mockUseParams.mockReturnValue({ planId: 'plan-1' });
    
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes('next-action')) {
        return Promise.resolve({
          data: {
            nextAction: { taskId: 't1', title: 'Learn Kubernetes', type: 'LEARNING' }
          }
        });
      }
      return Promise.resolve({
        data: { data: { _id: 'plan-1', title: 'Test Plan', status: 'ACTIVE', progress: 0, modules: [] } }
      });
    });
    
    (apiClient.post as any).mockResolvedValue({ data: { success: true } });

    renderWithRouter(<OnboardingView />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Complete Task/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Complete Task/i }));
    
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/nexus/onboarding/plans/plan-1/tasks/t1/complete', { outcome: 'passed' });
      // Verify it re-fetches
      expect(apiClient.get).toHaveBeenCalledTimes(4); // 2 initial + 2 after post
    });
  });

  it('8. Assessment failure displays remediation', async () => {
    mockUseParams.mockReturnValue({ planId: 'plan-1' });
    
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes('next-action')) {
        return Promise.resolve({
          data: {
            nextAction: { taskId: 't2', title: 'Remediation: K8s', type: 'PRACTICE' }
          }
        });
      }
      return Promise.resolve({
        data: { data: { _id: 'plan-1', title: 'Test Plan', status: 'ACTIVE', progress: 0, modules: [] } }
      });
    });

    renderWithRouter(<OnboardingView />);

    await waitFor(() => {
      expect(screen.getByText('❌ Assessment Not Passed')).toBeInTheDocument();
      expect(screen.getByText(/complete this remediation practice/i)).toBeInTheDocument();
    });
  });

  it('9. Completed module displays correctly', async () => {
    mockUseParams.mockReturnValue({ planId: 'plan-1' });
    
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes('next-action')) {
        return Promise.resolve({ data: { nextAction: null } });
      }
      return Promise.resolve({
        data: {
          data: { 
            _id: 'plan-1', 
            title: 'Test Plan', 
            status: 'ACTIVE', 
            progress: 0, 
            modules: [{
              _id: 'm1',
              title: 'Docker Module',
              status: 'COMPLETED',
              progress: 100,
              tasks: [{ _id: 't1', title: 'Learn Docker', status: 'COMPLETED', type: 'LEARNING' }]
            }]
          }
        }
      });
    });

    renderWithRouter(<OnboardingView />);

    await waitFor(() => {
      // Shows 100% progress for module
      expect(screen.getAllByText('100%')[0]).toBeInTheDocument();
      expect(screen.getByText('check')).toBeInTheDocument(); // The material icon for completed task
    });
  });

  it('10. Plan completion displays completion state', async () => {
    mockUseParams.mockReturnValue({ planId: 'plan-1' });
    
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes('next-action')) {
        return Promise.resolve({ data: { nextAction: null } });
      }
      return Promise.resolve({
        data: {
          data: { _id: 'plan-1', title: 'Completed Plan', status: 'COMPLETED', progress: 100, modules: [] }
        }
      });
    });

    renderWithRouter(<OnboardingView />);

    await waitFor(() => {
      expect(screen.getByText('Onboarding Complete')).toBeInTheDocument();
      expect(screen.getByText(/All required onboarding modules have been completed/i)).toBeInTheDocument();
    });
  });

  it('11. DRAFT plan does not expose completion controls', async () => {
    mockUseParams.mockReturnValue({ planId: 'plan-1' });
    
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes('next-action')) {
        return Promise.resolve({ data: { nextAction: { taskId: 't1', title: 'Task', type: 'LEARNING' } } });
      }
      return Promise.resolve({
        data: {
          data: { _id: 'plan-1', title: 'Draft Plan', status: 'DRAFT', progress: 0, modules: [] }
        }
      });
    });

    renderWithRouter(<OnboardingView />);

    await waitFor(() => {
      expect(screen.getByText('DRAFT PLAN')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Complete Task/i })).not.toBeInTheDocument();
    });
  });

  it('12. API error state', async () => {
    (apiClient.get as any).mockRejectedValue({ response: { data: { message: 'Unauthorized access' } } });
    renderWithRouter(<OnboardingView />);
    
    await waitFor(() => {
      expect(screen.getByText('Error: Unauthorized access')).toBeInTheDocument();
    });
  });

  it('13. AI guidance panel shows "Generate Guidance" button when plan is ACTIVE', async () => {
    mockUseParams.mockReturnValue({ planId: 'plan-ai' });

    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes('next-action')) {
        return Promise.resolve({ data: { nextAction: null, reason: 'PLAN_IS_DRAFT' } });
      }
      return Promise.resolve({
        data: {
          data: { _id: 'plan-ai', title: 'AI Test Plan', status: 'ACTIVE', progress: 20, modules: [] }
        }
      });
    });

    renderWithRouter(<OnboardingView />);
    await waitFor(() => {
      expect(screen.getByText('Generate Guidance')).toBeInTheDocument();
      expect(screen.getByText(/AI Learning Guidance/i)).toBeInTheDocument();
    });
  });

  it('14. AI guidance loads and renders skill guidance card', async () => {
    mockUseParams.mockReturnValue({ planId: 'plan-ai' });

    const mockAIResponse = {
      success: true,
      aiAvailable: true,
      guidance: {
        summary: 'Alice already has Docker experience, making Kubernetes a natural next step.',
        skillGuidance: [{
          skillId: 'skill-k8s',
          skillName: 'Kubernetes',
          whyItMatters: 'Kubernetes orchestrates your Docker containers.',
          recommendedFocus: ['Deployments', 'Services', 'Debugging'],
          practiceIdea: 'Deploy your Java service into a local K8s cluster.',
          estimatedDifficulty: 'INTERMEDIATE',
        }],
        nextActionExplanation: 'Learning Kubernetes fundamentals first is essential.',
        remediationGuidance: null,
      }
    };

    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes('ai-guidance')) return Promise.resolve({ data: mockAIResponse });
      if (url.includes('next-action')) return Promise.resolve({ data: { nextAction: null, reason: 'NONE' } });
      return Promise.resolve({
        data: { data: { _id: 'plan-ai', title: 'AI Test Plan', status: 'ACTIVE', progress: 20, modules: [] } }
      });
    });

    renderWithRouter(<OnboardingView />);
    await waitFor(() => expect(screen.getByText('AI Test Plan')).toBeInTheDocument());

    const genBtn = screen.getByRole('button', { name: /Generate Guidance/i });
    fireEvent.click(genBtn);

    await waitFor(() => {
      expect(screen.getByText('Kubernetes')).toBeInTheDocument();
      expect(screen.getByText('INTERMEDIATE')).toBeInTheDocument();
      expect(screen.getByText(/Docker.*making Kubernetes/i)).toBeInTheDocument();
    });
  });

  it('15. AI unavailable shows graceful error — not a crash', async () => {
    mockUseParams.mockReturnValue({ planId: 'plan-ai' });

    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes('ai-guidance')) return Promise.reject(new Error('Network Error'));
      if (url.includes('next-action')) return Promise.resolve({ data: { nextAction: null, reason: 'NONE' } });
      return Promise.resolve({
        data: { data: { _id: 'plan-ai', title: 'AI Test Plan', status: 'ACTIVE', progress: 0, modules: [] } }
      });
    });

    renderWithRouter(<OnboardingView />);
    await waitFor(() => expect(screen.getByText('Generate Guidance')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Generate Guidance/i }));

    await waitFor(() => {
      expect(screen.getByText(/AI guidance is currently unavailable/i)).toBeInTheDocument();
      // Modules section still renders — deterministic onboarding works
      expect(screen.getByText(/Modules/i)).toBeInTheDocument();
    });
  });

  it('16. AI panel only shown when plan status is ACTIVE — hidden for DRAFT', async () => {
    mockUseParams.mockReturnValue({ planId: 'plan-draft' });

    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes('next-action')) return Promise.resolve({ data: { nextAction: null, reason: 'PLAN_IS_DRAFT' } });
      return Promise.resolve({
        data: { data: { _id: 'plan-draft', title: 'Draft Plan', status: 'DRAFT', progress: 0, modules: [] } }
      });
    });

    renderWithRouter(<OnboardingView />);
    await waitFor(() => expect(screen.getByText('Draft Plan')).toBeInTheDocument());

    // AI panel should NOT render for DRAFT plans
    expect(screen.queryByText('AI Learning Guidance')).not.toBeInTheDocument();
    expect(screen.queryByText('Generate Guidance')).not.toBeInTheDocument();
  });

  it('17. AI remediation guidance rendered when present', async () => {
    mockUseParams.mockReturnValue({ planId: 'plan-remediation' });

    const mockAIResponse = {
      success: true,
      aiAvailable: true,
      guidance: {
        summary: 'You need to revisit pod scheduling concepts.',
        skillGuidance: [],
        nextActionExplanation: 'Complete the remediation before retrying.',
        remediationGuidance: 'Focus on Kubernetes scheduling — review resource requests and limits.',
      }
    };

    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes('ai-guidance')) return Promise.resolve({ data: mockAIResponse });
      if (url.includes('next-action')) return Promise.resolve({ data: { nextAction: { taskId: 't3', title: 'Remediation: Kubernetes', type: 'PRACTICE' }, reason: 'REMEDIATION' } });
      return Promise.resolve({
        data: { data: { _id: 'plan-remediation', title: 'Remediation Plan', status: 'ACTIVE', progress: 50, modules: [] } }
      });
    });

    renderWithRouter(<OnboardingView />);
    await waitFor(() => expect(screen.getByText('Generate Guidance')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Generate Guidance/i }));

    await waitFor(() => {
      expect(screen.getByText('Remediation Guidance')).toBeInTheDocument();
      expect(screen.getByText(/Focus on Kubernetes scheduling/i)).toBeInTheDocument();
    });
  });
});
