import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SkillGraphView from '../src/components/SkillGraphView';
import { apiClient } from '../src/api/client';

// Mock apiClient
vi.mock('../src/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

// Mock react-force-graph-2d since it relies on canvas
vi.mock('react-force-graph-2d', () => {
  const React = require('react');
  return {
    default: React.forwardRef((props: any, ref: any) => (
      <div data-testid="force-graph-2d" ref={ref}>Mocked Graph</div>
    )),
  };
});

describe('SkillGraphView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', async () => {
    let resolveApi: any;
    const promise = new Promise((resolve) => {
      resolveApi = resolve;
    });
    (apiClient.get as any).mockImplementation(() => promise);
    
    render(<SkillGraphView role="Administrator" user={{}} />);
    
    expect(screen.getByText('Workforce Intelligence: Skill Graph')).toBeInTheDocument();
    expect(screen.getByText('Loading Graph Data...')).toBeInTheDocument();
    
    // Resolve to avoid hanging promise
    resolveApi({ data: { success: true, nodes: [], edges: [], stats: {} } });
  });

  it('renders graph and legend when data loads successfully', async () => {
    (apiClient.get as any).mockResolvedValue({
      data: {
        success: true,
        nodes: [
          { id: '1', type: 'employee', label: 'John Doe' },
          { id: '2', type: 'skill', label: 'React' }
        ],
        edges: [
          { source: '1', target: '2', type: 'HAS_SKILL' }
        ],
        stats: { employees: 1, skills: 1, edges: 1 }
      }
    });

    render(<SkillGraphView role="Administrator" user={{}} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('force-graph-2d')).toBeInTheDocument();
    });
    
    // Check stats are rendered
    expect(screen.getAllByText('1').length).toBe(3); // 1 employee, 1 skill, 1 edge
    expect(screen.getByText(/Canonical Skills/)).toBeInTheDocument();
    
    // Check sidebar default state
    expect(screen.getByText(/Select a node in the graph to view its intelligence profile/)).toBeInTheDocument();
  });

  it('renders empty state if no nodes are returned', async () => {
    (apiClient.get as any).mockResolvedValue({
      data: {
        success: true,
        nodes: [],
        edges: [],
        stats: { employees: 0, skills: 0, edges: 0 }
      }
    });

    render(<SkillGraphView role="Administrator" user={{}} />);
    
    await waitFor(() => {
      expect(screen.getByText('No nodes match your filter criteria.')).toBeInTheDocument();
    });
  });

  it('renders error state on API failure', async () => {
    (apiClient.get as any).mockRejectedValue(new Error('Network Error'));

    render(<SkillGraphView role="Administrator" user={{}} />);
    
    await waitFor(() => {
      expect(screen.getByText('Network Error')).toBeInTheDocument();
    });
  });
});
