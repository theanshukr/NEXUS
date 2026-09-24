const fs = require('fs');

const batch1 = require('./vektorflow_data.json');

const batch2 = [
  {
    "employeeId": "EMP-1002",
    "personalDetails": {
      "firstName": "Ananya",
      "lastName": "Iyer",
      "role": "Chief Product Officer",
      "department": "Product",
      "email": "ananya.iyer@vektorflow.ai",
      "avatarUrl": "https://i.pravatar.cc/150?u=ananya",
      "location": "Bengaluru, Karnataka",
      "managerId": "EMP-1001",
      "joiningDate": "2022-02-15"
    },
    "payroll": {
      "baseSalary": 3600000,
      "currency": "INR",
      "recentPayslips": [
        {
          "month": "June 2026",
          "basicPay": 150000.00,
          "hra": 75000.00,
          "specialAllowance": 75000.00,
          "bonuses": 0.00,
          "deductions": 52000.00,
          "netPay": 248000.00,
          "status": "Paid"
        },
        {
          "month": "May 2026",
          "basicPay": 150000.00,
          "hra": 75000.00,
          "specialAllowance": 75000.00,
          "bonuses": 0.00,
          "deductions": 52000.00,
          "netPay": 248000.00,
          "status": "Paid"
        },
        {
          "month": "April 2026",
          "basicPay": 150000.00,
          "hra": 75000.00,
          "specialAllowance": 75000.00,
          "bonuses": 100000.00,
          "deductions": 84000.00,
          "netPay": 316000.00,
          "status": "Paid"
        }
      ]
    },
    "leaveAndAttendance": {
      "balances": {
        "annual": 16,
        "sick": 7,
        "casual": 5
      },
      "recentRequests": [
        {
          "type": "Casual Leave",
          "startDate": "2026-06-05",
          "endDate": "2026-06-06",
          "status": "Approved",
          "reason": "Personal documentation work"
        }
      ]
    },
    "performanceAndOKRs": [
      {
        "goalTitle": "Launch the Enterprise RBAC Custom Dashboard feature",
        "progressPercentage": 100,
        "status": "Completed",
        "dueDate": "2026-06-15",
        "managerFeedback": "Delivered exactly on spec. Enterprise clients are already configuring custom roles."
      },
      {
        "goalTitle": "Define core roadmap for Embedded AI Voice integrations",
        "progressPercentage": 60,
        "status": "On Track",
        "dueDate": "2026-09-01",
        "managerFeedback": "Initial wireframes and LLM orchestration architecture look highly scalable."
      }
    ],
    "assignedAssets": [
      {
        "assetId": "VFK-MAC-003",
        "type": "Hardware",
        "name": "MacBook Pro 14-inch M3 Max",
        "condition": "Excellent",
        "assignedDate": "2024-02-05"
      },
      {
        "assetId": "VFK-SW-008",
        "type": "Software License",
        "name": "Productboard Enterprise",
        "condition": "Active",
        "assignedDate": "2022-02-15"
      }
    ],
    "helpDeskTickets": [],
    "aiAssistantHistory": [
      {
        "query": "Give me a breakdown of open feature tickets in the Product department backlog.",
        "response": "There are currently 14 unresolved UI enhancement requests. 8 are flagged high priority for the upcoming sprint.",
        "timestamp": "2026-07-03T15:40:00Z"
      }
    ]
  },
  {
    "employeeId": "EMP-1003",
    "personalDetails": {
      "firstName": "Vikram",
      "lastName": "Rathore",
      "role": "VP of Engineering",
      "department": "Engineering",
      "email": "vikram.r@vektorflow.ai",
      "avatarUrl": "https://i.pravatar.cc/150?u=vikram",
      "location": "Bengaluru, Karnataka",
      "managerId": "EMP-1001",
      "joiningDate": "2022-03-01"
    },
    "payroll": {
      "baseSalary": 3800000,
      "currency": "INR",
      "recentPayslips": [
        {
          "month": "June 2026",
          "basicPay": 158333.33,
          "hra": 79166.66,
          "specialAllowance": 79166.66,
          "bonuses": 0.00,
          "deductions": 55500.00,
          "netPay": 261166.65,
          "status": "Paid"
        },
        {
          "month": "May 2026",
          "basicPay": 158333.33,
          "hra": 79166.66,
          "specialAllowance": 79166.66,
          "bonuses": 0.00,
          "deductions": 55500.00,
          "netPay": 261166.65,
          "status": "Paid"
        },
        {
          "month": "April 2026",
          "basicPay": 158333.33,
          "hra": 79166.66,
          "specialAllowance": 79166.66,
          "bonuses": 0.00,
          "deductions": 55500.00,
          "netPay": 261166.65,
          "status": "Paid"
        }
      ]
    },
    "leaveAndAttendance": {
      "balances": {
        "annual": 20,
        "sick": 8,
        "casual": 6
      },
      "recentRequests": []
    },
    "performanceAndOKRs": [
      {
        "goalTitle": "Reduce system wide cloud compute costs by 20%",
        "progressPercentage": 80,
        "status": "On Track",
        "dueDate": "2026-08-30",
        "managerFeedback": "The migration of experimental clusters to spot instances yielded great initial savings."
      }
    ],
    "assignedAssets": [
      {
        "assetId": "VFK-MAC-004",
        "type": "Hardware",
        "name": "MacBook Pro 16-inch M2 Max",
        "condition": "Good",
        "assignedDate": "2023-05-10"
      },
      {
        "assetId": "VFK-SW-012",
        "type": "Software License",
        "name": "AWS Organizations Admin Access",
        "condition": "Active",
        "assignedDate": "2022-03-01"
      }
    ],
    "helpDeskTickets": [],
    "aiAssistantHistory": [
      {
        "query": "List all engineering infrastructure alerts from last night.",
        "response": "Zero critical system alerts recorded. Database replication lag peaked at 140ms at 02:14 AM IST but self-stabilized.",
        "timestamp": "2026-07-06T08:30:00Z"
      }
    ]
  },
  {
    "employeeId": "EMP-1012",
    "personalDetails": {
      "firstName": "Amit",
      "lastName": "Verma",
      "role": "Director of Enterprise Sales",
      "department": "Sales & Growth",
      "email": "amit.verma@vektorflow.ai",
      "avatarUrl": "https://i.pravatar.cc/150?u=amit",
      "location": "Remote, India",
      "managerId": "EMP-1001",
      "joiningDate": "2023-08-20"
    },
    "payroll": {
      "baseSalary": 2200000,
      "currency": "INR",
      "recentPayslips": [
        {
          "month": "June 2026",
          "basicPay": 91666.67,
          "hra": 45833.33,
          "specialAllowance": 45833.33,
          "bonuses": 85000.00,
          "deductions": 48500.00,
          "netPay": 219833.33,
          "status": "Paid"
        },
        {
          "month": "May 2026",
          "basicPay": 91666.67,
          "hra": 45833.33,
          "specialAllowance": 45833.33,
          "bonuses": 120000.00,
          "deductions": 56000.00,
          "netPay": 247333.33,
          "status": "Paid"
        },
        {
          "month": "April 2026",
          "basicPay": 91666.67,
          "hra": 45833.33,
          "specialAllowance": 45833.33,
          "bonuses": 40000.00,
          "deductions": 37000.00,
          "netPay": 186333.33,
          "status": "Paid"
        }
      ]
    },
    "leaveAndAttendance": {
      "balances": {
        "annual": 12,
        "sick": 5,
        "casual": 2
      },
      "recentRequests": [
        {
          "type": "Annual Leave",
          "startDate": "2026-07-13",
          "endDate": "2026-07-17",
          "status": "Pending",
          "reason": "Family trip to Shimla"
        }
      ]
    },
    "performanceAndOKRs": [
      {
        "goalTitle": "Secure 5 new ARR contracts over ₹50L each",
        "progressPercentage": 80,
        "status": "On Track",
        "dueDate": "2026-09-30",
        "managerFeedback": "4 accounts closed successfully. Final negotiations active on the 5th."
      }
    ],
    "assignedAssets": [
      {
        "assetId": "VFK-MAC-022",
        "type": "Hardware",
        "name": "MacBook Air 13-inch M3",
        "condition": "Good",
        "assignedDate": "2023-08-22"
      },
      {
        "assetId": "VFK-SW-114",
        "type": "Software License",
        "name": "HubSpot Sales Hub Enterprise",
        "condition": "Active",
        "assignedDate": "2023-08-20"
      }
    ],
    "helpDeskTickets": [],
    "aiAssistantHistory": [
      {
        "query": "Check status of the corporate travel expense clearance for Mumbai visit.",
        "response": "Your expense invoice item VFK-EXP-9921 (₹24,500) was checked and approved by Finance on July 3. It will be credited in the July payroll cycle.",
        "timestamp": "2026-07-04T10:11:00Z"
      }
    ]
  },
  {
    "employeeId": "EMP-1015",
    "personalDetails": {
      "firstName": "Rohan",
      "lastName": "Kulkarni",
      "role": "Head of Finance & Compliance",
      "department": "Finance",
      "email": "rohan.k@vektorflow.ai",
      "avatarUrl": "https://i.pravatar.cc/150?u=rohank",
      "location": "Bengaluru, Karnataka",
      "managerId": "EMP-1001",
      "joiningDate": "2023-11-01"
    },
    "payroll": {
      "baseSalary": 2100000,
      "currency": "INR",
      "recentPayslips": [
        {
          "month": "June 2026",
          "basicPay": 87500.00,
          "hra": 43750.00,
          "specialAllowance": 43750.00,
          "bonuses": 0.00,
          "deductions": 29500.00,
          "netPay": 145500.00,
          "status": "Paid"
        },
        {
          "month": "May 2026",
          "basicPay": 87500.00,
          "hra": 43750.00,
          "specialAllowance": 43750.00,
          "bonuses": 0.00,
          "deductions": 29500.00,
          "netPay": 145500.00,
          "status": "Paid"
        },
        {
          "month": "April 2026",
          "basicPay": 87500.00,
          "hra": 43750.00,
          "specialAllowance": 43750.00,
          "bonuses": 0.00,
          "deductions": 29500.00,
          "netPay": 145500.00,
          "status": "Paid"
        }
      ]
    },
    "leaveAndAttendance": {
      "balances": {
        "annual": 14,
        "sick": 6,
        "casual": 4
      },
      "recentRequests": []
    },
    "performanceAndOKRs": [
      {
        "goalTitle": "Automate TDS filing pipelines and integrate with RazorpayX APIs",
        "progressPercentage": 100,
        "status": "Completed",
        "dueDate": "2026-06-15",
        "managerFeedback": "Automation has successfully lowered monthly cycle accounting times by 4 business days."
      }
    ],
    "assignedAssets": [
      {
        "assetId": "VFK-LPT-029",
        "type": "Hardware",
        "name": "Dell XPS 15",
        "condition": "Good",
        "assignedDate": "2023-11-02"
      }
    ],
    "helpDeskTickets": [
      {
        "ticketId": "HR-2209",
        "category": "Tax Computation",
        "subject": "System tax deduction rules updating for New Tax Regime provisions",
        "status": "Resolved",
        "createdAt": "2026-06-20",
        "history": [
          { "sender": "Rohan Kulkarni", "message": "Ensure the corporate engine correctly processes the standard tax slab modifications before rendering June payslips." },
          { "sender": "HR Tech Support", "message": "Updated script deployed. Base algorithms matched to latest specifications." }
        ]
      }
    ],
    "aiAssistantHistory": [
      {
        "query": "Generate an aggregate summary of unpaid corporate internet claims.",
        "response": "There are exactly 4 remote employee claims for June broadband processing awaiting authorization, total valuation: ₹6,000.",
        "timestamp": "2026-07-02T16:22:00Z"
      }
    ]
  },
  {
    "employeeId": "EMP-1020",
    "personalDetails": {
      "firstName": "Karan",
      "lastName": "Joshi",
      "role": "Lead Systems & IT Admin",
      "department": "IT Operations",
      "email": "karan.j@vektorflow.ai",
      "avatarUrl": "https://i.pravatar.cc/150?u=karan",
      "location": "Bengaluru, Karnataka",
      "managerId": "EMP-1003",
      "joiningDate": "2024-02-10"
    },
    "payroll": {
      "baseSalary": 1400000,
      "currency": "INR",
      "recentPayslips": [
        {
          "month": "June 2026",
          "basicPay": 58333.33,
          "hra": 29166.66,
          "specialAllowance": 29166.66,
          "bonuses": 0.00,
          "deductions": 16500.00,
          "netPay": 100166.65,
          "status": "Paid"
        },
        {
          "month": "May 2026",
          "basicPay": 58333.33,
          "hra": 29166.66,
          "specialAllowance": 29166.66,
          "bonuses": 0.00,
          "deductions": 16500.00,
          "netPay": 100166.65,
          "status": "Paid"
        },
        {
          "month": "April 2026",
          "basicPay": 58333.33,
          "hra": 29166.66,
          "specialAllowance": 29166.66,
          "bonuses": 0.00,
          "deductions": 16500.00,
          "netPay": 100166.65,
          "status": "Paid"
        }
      ]
    },
    "leaveAndAttendance": {
      "balances": {
        "annual": 15,
        "sick": 4,
        "casual": 4
      },
      "recentRequests": []
    },
    "performanceAndOKRs": [
      {
        "goalTitle": "Transition hardware inventory verification to MDM tracking software",
        "progressPercentage": 90,
        "status": "On Track",
        "dueDate": "2026-07-31",
        "managerFeedback": "45 laptops out of 50 fully registered under Kandji MDM hooks."
      }
    ],
    "assignedAssets": [
      {
        "assetId": "VFK-MAC-035",
        "type": "Hardware",
        "name": "MacBook Pro 14-inch M2 Pro",
        "condition": "Good",
        "assignedDate": "2024-02-11"
      },
      {
        "assetId": "VFK-SW-210",
        "type": "Software License",
        "name": "Kandji Admin Workspace",
        "condition": "Active",
        "assignedDate": "2024-02-15"
      }
    ],
    "helpDeskTickets": [
      {
        "ticketId": "IT-9011",
        "category": "Infrastructure Allocation",
        "subject": "Additional AWS p4d.24xlarge GPU quota allocation",
        "status": "In Progress",
        "createdAt": "2026-07-04",
        "history": [
          { "sender": "Aarav Mehta", "message": "Need standard capacity extensions on our training node limits for the multi-modal pipeline runs." },
          { "sender": "Karan Joshi", "message": "Request logged with AWS enterprise support team. Awaiting region limit release confirmation." }
        ]
      }
    ],
    "aiAssistantHistory": [
      {
        "query": "How many active hardware tracking profiles are missing MDM reporting checks?",
        "response": "Exactly 5 devices assigned to remote locations haven't returned status pings over the last 72 hours.",
        "timestamp": "2026-07-05T09:12:00Z"
      }
    ]
  },
  {
    "employeeId": "EMP-1042",
    "personalDetails": {
      "firstName": "Deepika",
      "lastName": "Rao",
      "role": "QA Automation Engineer",
      "department": "Engineering",
      "email": "deepika.rao@vektorflow.ai",
      "avatarUrl": "https://i.pravatar.cc/150?u=deepika",
      "location": "Hyderabad, Telangana",
      "managerId": "EMP-1024",
      "joiningDate": "2025-06-01"
    },
    "payroll": {
      "baseSalary": 1100000,
      "currency": "INR",
      "recentPayslips": [
        {
          "month": "June 2026",
          "basicPay": 45833.33,
          "hra": 22916.66,
          "specialAllowance": 22916.66,
          "bonuses": 0.00,
          "deductions": 12800.00,
          "netPay": 78866.65,
          "status": "Paid"
        },
        {
          "month": "May 2026",
          "basicPay": 45833.33,
          "hra": 22916.66,
          "specialAllowance": 22916.66,
          "bonuses": 0.00,
          "deductions": 12800.00,
          "netPay": 78866.65,
          "status": "Paid"
        }
      ]
    },
    "leaveAndAttendance": {
      "balances": {
        "annual": 12,
        "sick": 5,
        "casual": 3
      },
      "recentRequests": [
        {
          "type": "Sick Leave",
          "startDate": "2026-06-18",
          "endDate": "2026-06-19",
          "status": "Approved",
          "reason": "Dental treatment appointment"
        }
      ]
    },
    "performanceAndOKRs": [
      {
        "goalTitle": "Build comprehensive Playwright End-to-End framework for RBAC logic",
        "progressPercentage": 90,
        "status": "On Track",
        "dueDate": "2026-07-31",
        "managerFeedback": "Test suites run accurately on automated GitHub actions pushes now."
      }
    ],
    "assignedAssets": [
      {
        "assetId": "VFK-MAC-094",
        "type": "Hardware",
        "name": "MacBook Air 15-inch M2",
        "condition": "Good",
        "assignedDate": "2025-06-02"
      }
    ],
    "helpDeskTickets": [],
    "aiAssistantHistory": [
      {
        "query": "Show company policy on compensatory leaves.",
        "response": "Working weekends under product release requirements yields 1 Comp-Off balance, provided it is authorized by your engineering lead within 7 operational days.",
        "timestamp": "2026-07-01T14:02:00Z"
      }
    ]
  }
];

const batch3 = [
  {
    "employeeId": "EMP-1004",
    "personalDetails": {
      "firstName": "Siddharth",
      "lastName": "Kapoor",
      "role": "Director of Growth & Marketing",
      "department": "Sales & Growth",
      "email": "siddharth.k@vektorflow.ai",
      "avatarUrl": "https://i.pravatar.cc/150?u=siddharth",
      "location": "Bengaluru, Karnataka",
      "managerId": "EMP-1001",
      "joiningDate": "2022-04-01"
    },
    "payroll": {
      "baseSalary": 2000000,
      "currency": "INR",
      "recentPayslips": [
        {
          "month": "June 2026",
          "basicPay": 83333.33,
          "hra": 41666.66,
          "specialAllowance": 41666.66,
          "bonuses": 0.00,
          "deductions": 28500.00,
          "netPay": 138166.65,
          "status": "Paid"
        },
        {
          "month": "May 2026",
          "basicPay": 83333.33,
          "hra": 41666.66,
          "specialAllowance": 41666.66,
          "bonuses": 50000.00,
          "deductions": 43500.00,
          "netPay": 174666.65,
          "status": "Paid"
        },
        {
          "month": "April 2026",
          "basicPay": 83333.33,
          "hra": 41666.66,
          "specialAllowance": 41666.66,
          "bonuses": 0.00,
          "deductions": 28500.00,
          "netPay": 138166.65,
          "status": "Paid"
        }
      ]
    },
    "leaveAndAttendance": {
      "balances": {
        "annual": 14,
        "sick": 6,
        "casual": 4
      },
      "recentRequests": []
    },
    "performanceAndOKRs": [
      {
        "goalTitle": "Scale monthly inbound qualified leads by 35%",
        "progressPercentage": 85,
        "status": "On Track",
        "dueDate": "2026-09-15",
        "managerFeedback": "The targeted LinkedIn account-based marketing campaign is driving solid conversions."
      }
    ],
    "assignedAssets": [
      {
        "assetId": "VFK-MAC-006",
        "type": "Hardware",
        "name": "MacBook Air 15-inch M3",
        "condition": "Excellent",
        "assignedDate": "2024-02-10"
      }
    ],
    "helpDeskTickets": [],
    "aiAssistantHistory": [
      {
        "query": "What is the marketing budget left for Q3 performance ads?",
        "response": "Out of the allocated ₹15,000,000 for Q3 digital marketing spend, ₹9,20,000 remains uncommitted.",
        "timestamp": "2026-07-05T14:10:00Z"
      }
    ]
  },
  {
    "employeeId": "EMP-1010",
    "personalDetails": {
      "firstName": "Meera",
      "lastName": "Joshi",
      "role": "Senior Frontend Engineer",
      "department": "Engineering",
      "email": "meera.j@vektorflow.ai",
      "avatarUrl": "https://i.pravatar.cc/150?u=meera",
      "location": "Remote, India",
      "managerId": "EMP-1003",
      "joiningDate": "2023-06-01"
    },
    "payroll": {
      "baseSalary": 1650000,
      "currency": "INR",
      "recentPayslips": [
        {
          "month": "June 2026",
          "basicPay": 68750.00,
          "hra": 34375.00,
          "specialAllowance": 34375.00,
          "bonuses": 0.00,
          "deductions": 21500.00,
          "netPay": 116000.00,
          "status": "Paid"
        },
        {
          "month": "May 2026",
          "basicPay": 68750.00,
          "hra": 34375.00,
          "specialAllowance": 34375.00,
          "bonuses": 0.00,
          "deductions": 21500.00,
          "netPay": 116000.00,
          "status": "Paid"
        },
        {
          "month": "April 2026",
          "basicPay": 68750.00,
          "hra": 34375.00,
          "specialAllowance": 34375.00,
          "bonuses": 0.00,
          "deductions": 21500.00,
          "netPay": 116000.00,
          "status": "Paid"
        }
      ]
    },
    "leaveAndAttendance": {
      "balances": {
        "annual": 11,
        "sick": 5,
        "casual": 3
      },
      "recentRequests": [
        {
          "type": "Annual Leave",
          "startDate": "2026-07-27",
          "endDate": "2026-07-31",
          "status": "Approved",
          "reason": "Personal commitments at home town"
        }
      ]
    },
    "performanceAndOKRs": [
      {
        "goalTitle": "Optimize client rendering speeds to slash Largest Contentful Paint by 20%",
        "progressPercentage": 100,
        "status": "Completed",
        "dueDate": "2026-06-20",
        "managerFeedback": "Incredible optimization work. Real-time data tables render noticeably faster now."
      }
    ],
    "assignedAssets": [
      {
        "assetId": "VFK-MAC-019",
        "type": "Hardware",
        "name": "MacBook Pro 14-inch M2 Max",
        "condition": "Good",
        "assignedDate": "2023-06-02"
      }
    ],
    "helpDeskTickets": [],
    "aiAssistantHistory": [
      {
        "query": "How many casual leave days do I have left?",
        "response": "You currently have 3 casual leave days remaining for the calendar year.",
        "timestamp": "2026-07-04T09:45:00Z"
      }
    ]
  },
  {
    "employeeId": "EMP-1018",
    "personalDetails": {
      "firstName": "Neha",
      "lastName": "Reddy",
      "role": "Talent Acquisition Specialist",
      "department": "HR",
      "email": "neha.r@vektorflow.ai",
      "avatarUrl": "https://i.pravatar.cc/150?u=neha",
      "location": "Hyderabad, Telangana",
      "managerId": "EMP-1008",
      "joiningDate": "2024-01-15"
    },
    "payroll": {
      "baseSalary": 950000,
      "currency": "INR",
      "recentPayslips": [
        {
          "month": "June 2026",
          "basicPay": 39583.33,
          "hra": 19791.66,
          "specialAllowance": 19791.66,
          "bonuses": 15000.00,
          "deductions": 12400.00,
          "netPay": 81766.65,
          "status": "Paid"
        },
        {
          "month": "May 2026",
          "basicPay": 39583.33,
          "hra": 19791.66,
          "specialAllowance": 19791.66,
          "bonuses": 0.00,
          "deductions": 10400.00,
          "netPay": 68766.65,
          "status": "Paid"
        }
      ]
    },
    "leaveAndAttendance": {
      "balances": {
        "annual": 15,
        "sick": 6,
        "casual": 5
      },
      "recentRequests": []
    },
    "performanceAndOKRs": [
      {
        "goalTitle": "Close core DevOps Architect position hiring requirements",
        "progressPercentage": 50,
        "status": "In Progress",
        "dueDate": "2026-07-31",
        "managerFeedback": "Top-tier candidate sourcing pipeline is ready. Ensure final assessment turnarounds stay brisk."
      }
    ],
    "assignedAssets": [
      {
        "assetId": "VFK-MAC-031",
        "type": "Hardware",
        "name": "MacBook Air 13-inch M2",
        "condition": "Good",
        "assignedDate": "2024-01-16"
      }
    ],
    "helpDeskTickets": [],
    "aiAssistantHistory": [
      {
        "query": "Fetch pipeline stats for the DevOps Architect role.",
        "response": "There are currently 2 active candidates processing for the DevOps Architect position. David Chen is in the System Design round.",
        "timestamp": "2026-07-06T10:14:00Z"
      }
    ]
  },
  {
    "employeeId": "EMP-1029",
    "personalDetails": {
      "firstName": "Arjun",
      "lastName": "Mishra",
      "role": "IT Support Engineer",
      "department": "IT Operations",
      "email": "arjun.m@vektorflow.ai",
      "avatarUrl": "https://i.pravatar.cc/150?u=arjun",
      "location": "Bengaluru, Karnataka",
      "managerId": "EMP-1020",
      "joiningDate": "2024-09-01"
    },
    "payroll": {
      "baseSalary": 750000,
      "currency": "INR",
      "recentPayslips": [
        {
          "month": "June 2026",
          "basicPay": 31250.00,
          "hra": 15625.00,
          "specialAllowance": 15625.00,
          "bonuses": 0.00,
          "deductions": 8200.00,
          "netPay": 54300.00,
          "status": "Paid"
        },
        {
          "month": "May 2026",
          "basicPay": 31250.00,
          "hra": 15625.00,
          "specialAllowance": 15625.00,
          "bonuses": 0.00,
          "deductions": 8200.00,
          "netPay": 54300.00,
          "status": "Paid"
        }
      ]
    },
    "leaveAndAttendance": {
      "balances": {
        "annual": 12,
        "sick": 4,
        "casual": 4
      },
      "recentRequests": [
        {
          "type": "Casual Leave",
          "startDate": "2026-07-10",
          "endDate": "2026-07-10",
          "status": "Approved",
          "reason": "Medical checkup setup"
        }
      ]
    },
    "performanceAndOKRs": [
      {
        "goalTitle": "Maintain internal IT SLA first-response turnaround under 45 minutes",
        "progressPercentage": 95,
        "status": "On Track",
        "dueDate": "2026-08-30",
        "managerFeedback": "Strong coverage numbers. Internal satisfaction ratings sit healthy at 4.8/5."
      }
    ],
    "assignedAssets": [
      {
        "assetId": "VFK-LPT-055",
        "type": "Hardware",
        "name": "Dell Latitude 5440",
        "condition": "Good",
        "assignedDate": "2024-09-02"
      }
    ],
    "helpDeskTickets": [
      {
        "ticketId": "IT-9250",
        "category": "Hardware Setup",
        "subject": "Deploy replacement office mouse hardware",
        "status": "Resolved",
        "createdAt": "2026-06-29",
        "history": [
          { "sender": "Arjun Mishra", "message": "Handed over Logitech MX Master 3S unit to physical workstation pod B." }
        ]
      }
    ],
    "aiAssistantHistory": [
      {
        "query": "Show unassigned hardware inventory remaining in the Bengaluru hub cupboard.",
        "response": "There are 3 MacBook Air 13-inch configurations and 2 Dell external monitors currently marked unassigned.",
        "timestamp": "2026-07-02T11:00:00Z"
      }
    ]
  },
  {
    "employeeId": "EMP-1038",
    "personalDetails": {
      "firstName": "Sneha",
      "lastName": "Patil",
      "role": "Senior Data Analyst",
      "department": "Product",
      "email": "sneha.p@vektorflow.ai",
      "avatarUrl": "https://i.pravatar.cc/150?u=sneha",
      "location": "Remote, India",
      "managerId": "EMP-1002",
      "joiningDate": "2025-03-15"
    },
    "payroll": {
      "baseSalary": 1350000,
      "currency": "INR",
      "recentPayslips": [
        {
          "month": "June 2026",
          "basicPay": 56250.00,
          "hra": 28125.00,
          "specialAllowance": 28125.00,
          "bonuses": 0.00,
          "deductions": 15800.00,
          "netPay": 96700.00,
          "status": "Paid"
        },
        {
          "month": "May 2026",
          "basicPay": 56250.00,
          "hra": 28125.00,
          "specialAllowance": 28125.00,
          "bonuses": 0.00,
          "deductions": 15800.00,
          "netPay": 96700.00,
          "status": "Paid"
        }
      ]
    },
    "leaveAndAttendance": {
      "balances": {
        "annual": 13,
        "sick": 6,
        "casual": 4
      },
      "recentRequests": []
    },
    "performanceAndOKRs": [
      {
        "goalTitle": "Deploy operational retention cohort metrics models into Amplitude logs",
        "progressPercentage": 90,
        "status": "On Track",
        "dueDate": "2026-07-31",
        "managerFeedback": "The core data schema mappings look reliable. Good cross-functional alignment."
      }
    ],
    "assignedAssets": [
      {
        "assetId": "VFK-MAC-072",
        "type": "Hardware",
        "name": "MacBook Pro 14-inch M3 Pro",
        "condition": "Excellent",
        "assignedDate": "2025-03-16"
      }
    ],
    "helpDeskTickets": [],
    "aiAssistantHistory": [
      {
        "query": "Show documentation on company allowance structures for home office desks.",
        "response": "VektorFlow Labs allows a physical equipment reimbursement max cap of ₹15,000 for approved home setups.",
        "timestamp": "2026-06-18T15:20:00Z"
      }
    ]
  },
  {
    "employeeId": "EMP-1045",
    "personalDetails": {
      "firstName": "Vikram",
      "lastName": "Singhania",
      "role": "Enterprise Account Executive",
      "department": "Sales & Growth",
      "email": "vikram.s@vektorflow.ai",
      "avatarUrl": "https://i.pravatar.cc/150?u=vikrams",
      "location": "Hyderabad, Telangana",
      "managerId": "EMP-1012",
      "joiningDate": "2025-08-01"
    },
    "payroll": {
      "baseSalary": 1200000,
      "currency": "INR",
      "recentPayslips": [
        {
          "month": "June 2026",
          "basicPay": 50000.00,
          "hra": 25000.00,
          "specialAllowance": 25000.00,
          "bonuses": 45000.00,
          "deductions": 21500.00,
          "netPay": 128500.00,
          "status": "Paid"
        },
        {
          "month": "May 2026",
          "basicPay": 50000.00,
          "hra": 25000.00,
          "specialAllowance": 25000.00,
          "bonuses": 30000.00,
          "deductions": 18500.00,
          "netPay": 111500.00,
          "status": "Paid"
        }
      ]
    },
    "leaveAndAttendance": {
      "balances": {
        "annual": 14,
        "sick": 5,
        "casual": 3
      },
      "recentRequests": [
        {
          "type": "Casual Leave",
          "startDate": "2026-06-25",
          "endDate": "2026-06-26",
          "status": "Approved",
          "reason": "Moving house arrangements"
        }
      ]
    },
    "performanceAndOKRs": [
      {
        "goalTitle": "Maintain pipeline velocity targets above 80%",
        "progressPercentage": 95,
        "status": "Completed",
        "dueDate": "2026-06-30",
        "managerFeedback": "Strong mid-market conversions over the closing weeks of the quarter."
      }
    ],
    "assignedAssets": [
      {
        "assetId": "VFK-MAC-089",
        "type": "Hardware",
        "name": "MacBook Air 13-inch M3",
        "condition": "Good",
        "assignedDate": "2025-08-03"
      }
    ],
    "helpDeskTickets": [],
    "aiAssistantHistory": [
      {
        "query": "Check if my client dinners expense from June 14 was processed.",
        "response": "Invoice tracking reference VFK-EXP-8722 (₹8,450) was cleared by Rohan Kulkarni on July 2.",
        "timestamp": "2026-07-03T11:05:00Z"
      }
    ]
  }
];

batch1.employees.push(...batch2);
batch1.employees.push(...batch3);

fs.writeFileSync('./vektorflow_data.json', JSON.stringify(batch1, null, 2));
console.log('Successfully merged all 17 employees into vektorflow_data.json!');
