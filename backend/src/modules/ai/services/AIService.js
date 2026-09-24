class AIService {
  /**
   * Get initial contextual history and quick prompts for a user based on their roles
   */
  async getInitialContext(user) {
    const roles = user.roles || [];
    let roleKey = 'Standard Employee';
    
    if (roles.includes('HR Manager')) roleKey = 'HR Manager';
    else if (roles.includes('IT Admin') || roles.includes('Administrator')) roleKey = 'IT Admin';
    else if (roles.includes('Finance Executive') || roles.includes('Finance')) roleKey = 'Finance Executive';
    else if (roles.includes('Super Admin')) roleKey = 'Super Admin';

    // Mock history and prompts based on role
    const contextMap = {
      'Standard Employee': {
        history: [
          { title: 'Apply for Sick Leave', desc: 'Pending Confirmation' },
          { title: 'IT Ticket Status', desc: 'Mouse Replacement' }
        ],
        quickPrompts: [
          "What's my remaining PTO balance?",
          "How do I submit an IT ticket?",
          "Show me upcoming company holidays",
          "What are the benefits for remote work?"
        ]
      },
      'HR Manager': {
        history: [
          { title: 'Approve Leave Requests', desc: '2 pending actions' },
          { title: 'Candidate Pipeline', desc: 'Frontend Engineer Role' }
        ],
        quickPrompts: [
          "Summarize open leave requests",
          "Generate Q3 attrition report",
          "Draft a job description for Senior PM",
          "Show me compliance gaps"
        ]
      },
      'IT Admin': {
        history: [
          { title: 'Asset Allocation', desc: 'New Hire Onboarding' },
          { title: 'Reset VPN Password', desc: 'David Lee' }
        ],
        quickPrompts: [
          "Identify security anomalies today",
          "List unassigned laptops",
          "Revoke VPN access for inactive users",
          "Summarize open help desk tickets"
        ]
      },
      'Finance Executive': {
        history: [
          { title: 'Q3 Travel Expenses', desc: 'Summary generated' },
          { title: 'Payroll Run Draft', desc: 'Pending HR review' }
        ],
        quickPrompts: [
          "Show Q3 expense breakdown",
          "Project payroll impact of open roles",
          "Calculate leave liability for EMEA",
          "Identify duplicate expense claims"
        ]
      },
      'Super Admin': {
        history: [
          { title: 'Security Alert Triage', desc: 'High Priority Action' },
          { title: 'API Rate Limits', desc: 'Updated to 10k/min' }
        ],
        quickPrompts: [
          "Check current system API health",
          "Generate security audit log for today",
          "Who accessed the database today?",
          "List active admin sessions"
        ]
      }
    };

    return contextMap[roleKey] || contextMap['Standard Employee'];
  }

  /**
   * Process a query and return simulated LLM responses with dynamic widgets
   */
  async processQuery(user, query) {
    const q = query.toLowerCase();
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));

    // 1. Employee Leave Scenario
    if (q.includes('sick') || q.includes('leave') || q.includes('pto')) {
      return {
        text: "I've drafted a sick leave application for you for today and tomorrow. Please confirm the details below to submit it:",
        widgetType: 'leave_application',
        widgetPayload: {
          title: 'Sick Leave Application',
          balance: '5 Days',
          duration: '2 Days',
          dates: 'Jul 02 - Jul 03',
          actionText: 'Confirm & Submit Request'
        }
      };
    }

    // 2. HR Manager Approval Scenario
    if (q.includes('approve') || q.includes('pending leave')) {
      return {
        text: "You have 2 pending leave requests requiring your approval. I have fetched the details for you from the Attendance module:",
        widgetType: 'leave_approval',
        widgetPayload: {
          employeeName: 'Priya Sharma',
          employeeTitle: 'Senior Frontend Engineer',
          leaveType: '2 Days Casual',
          dates: 'Aug 12 - Aug 13',
          actions: ['Approve', 'Reject']
        }
      };
    }

    // 3. IT Admin Asset Scenario
    if (q.includes('assign') || q.includes('laptop') || q.includes('macbook')) {
      return {
        text: "I found an available MacBook Pro (M3 Max) in the inventory. Would you like to formally assign it? This will update the Asset Management module instantly.",
        widgetType: 'asset_allocation',
        widgetPayload: {
          assetName: 'MacBook Pro 16"',
          assetDetails: 'S/N: C02XYZ1234 • Condition: New',
          assigneeName: 'Amit Kumar',
          assigneeDept: 'Backend Team',
          actionText: 'Confirm Assignment'
        }
      };
    }

    // 4. Finance Expense Scenario
    if (q.includes('expense') || q.includes('travel')) {
      return {
        text: "Here is the summary of Q3 travel expenses broken down by department, directly pulled from the Expense module:",
        widgetType: 'expense_summary',
        widgetPayload: {
          title: 'Q3 Travel Expenses',
          total: '$29,700',
          rows: [
            { dept: 'Sales', trips: '14 Trips', amount: '$24,500' },
            { dept: 'Engineering', trips: '3 Trips', amount: '$5,200' }
          ]
        }
      };
    }

    // 5. Super Admin Security Scenario
    if (q.includes('suspend') || q.includes('security alert')) {
      return {
        text: "I have prepared the suspension payload for the requested user. Because this is a destructive global action, please authenticate with your 2FA token to execute the suspension.",
        widgetType: 'security_action',
        widgetPayload: {
          targetName: 'John Doe',
          targetDetails: 'johndoe@xebia.com • 2 Active Sessions',
          requires2FA: true,
          actionText: 'Execute Suspension'
        }
      };
    }

    // Fallback Generic Response
    return {
      text: `I understand you're asking about "${query}". I am currently running in a simulated mode and don't have a specific widget for this query. Try asking about leave, expenses, or asset allocation!`,
      widgetType: null,
      widgetPayload: null
    };
  }
}

export default new AIService();
