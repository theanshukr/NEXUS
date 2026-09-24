import ConversationManager from '#ai/memory/ConversationManager.js';

/**
 * PromptBuilder — Assembles the full system prompt for each LLM invocation.
 *
 * The system prompt is composed of multiple layers stacked in order:
 *   1. Base instructions (persona, rules, output format)
 *   2. Organization context (name, user name, roles)
 *   3. UI context (current page, selected module)
 *   4. Long-term summary (compressed past session memory)
 *   5. Current date/time (temporal grounding)
 *
 * The system prompt is NEVER user-controlled — it is fully server-assembled.
 * This prevents prompt injection attacks from influencing the AI's persona.
 */
class PromptBuilder {
  /**
   * Builds the complete system prompt for an AI request.
   *
   * @param {object} userContext    { userId, organizationId, email, name, roles, permissions }
   * @param {object} orgContext     { orgName, plan, features }
   * @param {object} clientContext  { currentModule, currentPageUrl, selectedRecordIds }
   * @returns {Promise<string>}
   */
  async buildSystemPrompt(userContext, orgContext, clientContext) {
    const parts = [];

    // 1. Base persona and rules
    parts.push(this._baseInstructions());

    // 2. User identity and organizational context
    parts.push(this._userContext(userContext, orgContext));

    // 3. UI context (what page the user is currently on)
    if (clientContext?.currentModule) {
      parts.push(this._uiContext(clientContext));
    }

    // 4. Long-term memory — inject compressed past session summary if available
    const summary = await ConversationManager.getSummary(userContext.organizationId, userContext.userId);
    if (summary) {
      parts.push(`## Previous Session Summary\n${summary}`);
    }

    // 5. Temporal grounding
    parts.push(`## Current Date & Time\n${new Date().toISOString()} (UTC)`);

    return parts.join('\n\n---\n\n');
  }

  _baseInstructions() {
    return `## NexusOps AI Co-Pilot — Core Instructions

You are **NexusOps AI Co-Pilot**, an intelligent enterprise workforce management assistant embedded in the NexusOps platform. Your role is to help users efficiently navigate HR operations through natural conversation.

### Your Capabilities
- Answer questions about HR policies, leave balances, attendance, payroll, projects, and organizational data
- Execute actions on behalf of the user using available tools (create leaves, approve requests, generate reports)
- Search company documents and policies using semantic RAG search
- Provide data-driven insights and summaries based on the user's permissions

### Non-Negotiable Rules
1. **RBAC is absolute**: You may only invoke tools for which the user has the required permissions. Never attempt to bypass or work around permissions.
2. **No fabrication**: If you don't have enough data to answer, say so clearly. Never invent employee names, IDs, dates, figures, or invitation URLs. When generating onboarding invitation links, you MUST invoke the appropriate tool and use the exact invite URL returned by it; never manually format or construct invitation links.
3. **Destructive action confirmation**: Before executing irreversible actions (payroll lock, account suspension), explicitly state what you are about to do and ask for confirmation.
4. **Data privacy**: Never expose salary details, medical records, or PII of one employee to another unless the requesting user has explicit view_salary or HR admin permission.
5. **Tenant isolation**: You only have access to data within the user's organization. You cannot access or reference data from other organizations.
6. **Concise and actionable**: Keep responses focused. Lead with the answer, provide supporting details below.
7. **Professional tone**: Maintain a professional, helpful tone. Avoid casual language or emoji in operational contexts.
8. **Invitation URLs**: When generating onboarding or registration invitation links, you MUST call the appropriate tool (\`mcp_invites_create\` or \`mcp_emp_invite\`). You must ALWAYS return the exact \`inviteUrl\` returned in the tool execution output (which maps to \`http://localhost:5173/join?token=<token>\`). Never hallucinate, mock, or manually format invitation URLs (such as using placeholders like your-organization.nexuseops.com).

### Output Format
- Use markdown for structured responses (tables, bullet points)
- For approval/rejection decisions, always confirm what action was taken and on whose behalf
- For search results, cite the source document and section
- For error conditions, explain what went wrong and suggest next steps`;
  }

  _userContext(userContext, orgContext) {
    const roleList = Array.isArray(userContext.roles) ? userContext.roles.join(', ') : 'Employee';
    const orgName  = orgContext?.orgName || 'Your Organization';
    const plan     = orgContext?.plan || 'Enterprise';

    return `## User Context
- **Name**: ${userContext.name || userContext.email}
- **Email**: ${userContext.email}
- **Organization**: ${orgName} (Plan: ${plan})
- **Roles**: ${roleList}
- **User ID**: ${userContext.userId}
- **Organization ID**: ${userContext.organizationId}

The user's permissions determine which tools you can invoke. Always respect the tool's requiredPermissions.`;
  }

  _uiContext(clientContext) {
    const lines = [`## Current UI Context`];
    if (clientContext.currentModule) {
      lines.push(`- **Active Module**: ${clientContext.currentModule}`);
    }
    if (clientContext.currentPageUrl) {
      lines.push(`- **Current Page**: ${clientContext.currentPageUrl}`);
    }
    if (clientContext.selectedRecordIds?.length > 0) {
      lines.push(`- **Selected Records**: ${clientContext.selectedRecordIds.join(', ')}`);
    }
    lines.push('Use this context to provide relevant, targeted assistance for what the user is currently working on.');
    return lines.join('\n');
  }
}

export default new PromptBuilder();
