import type { ModuleDefinition } from './types'

export const modules: Record<string, ModuleDefinition> = {
  wizard: {
    title: 'Wizard',
    summary:
      'Resume a planning session and turn its next decision into a task.',
    collection: 'Project sessions',
    singular: 'Session',
    source: 'Project sessions saved in this workspace',
    createLabel: 'New project',
    noteLabel: 'Session note',
    linked: {
      view: 'chats',
      label: 'Open agent conversations',
    },
  },
  comms: {
    title: 'Comms',
    summary: 'Review saved outreach drafts and conversations.',
    collection: 'Inbox',
    singular: 'Conversation',
    source:
      'Email drafts and conversation notes. Email delivery is disconnected.',
    createLabel: 'New conversation',
    noteLabel: 'Thread note',
    linked: {
      view: 'connections',
      label: 'Inspect communication sources',
    },
  },
  funnel: {
    title: 'Funnel',
    summary:
      'Inspect where each business entered the pipeline and what should happen next.',
    collection: 'Business journeys',
    singular: 'Journey',
    source: 'Pipeline notes saved in this workspace',
    createLabel: 'Add pipeline note',
    linked: {
      view: 'sales',
      label: 'Open sales calls',
    },
  },
  'brand-deals': {
    title: 'Brand Deals',
    summary:
      'Review a sponsorship brief, its proposed reply and the recorded outcome.',
    collection: 'Partnerships',
    singular: 'Partnership',
    source: 'Partnerships entered by hand',
    createLabel: 'Add partnership',
    noteLabel: 'Drafting rule',
    linked: {
      view: 'comms',
      label: 'Open conversations',
    },
  },
  clients: {
    title: 'Clients',
    summary: 'Open a company brief, inspect its requests and track delivery.',
    collection: 'Client briefs',
    singular: 'Brief',
    source: 'Briefs saved in this workspace',
    createLabel: 'Add brief',
    noteLabel: 'Delivery note',
    actions: [
      {
        label: 'Start brief',
        status: 'In progress',
        from: ['Ready to assign', 'Draft'],
      },
      {
        label: 'Request review',
        status: 'In review',
        from: ['In progress'],
      },
      {
        label: 'Accept deliverable',
        status: 'Complete',
        from: ['In review'],
      },
    ],
  },
  trading: {
    title: 'Trading',
    summary: 'Record dated observations about investment accounts.',
    collection: 'Account snapshots',
    singular: 'Snapshot',
    source: 'Account snapshots entered by hand',
    createLabel: 'Add snapshot',
    linked: {
      view: 'connections',
      label: 'Inspect connection registry',
    },
  },
  agents: {
    title: 'Agents',
    summary: 'Keep an agent roster and track assignments.',
    collection: 'Agent roster',
    singular: 'Agent',
    source: 'Roster maintained in this workspace',
    createLabel: 'Add agent',
    linked: {
      view: 'tasks',
      label: 'Open assigned work',
    },
  },
  chats: {
    title: 'Chats',
    summary: 'Keep project threads and handoff notes.',
    collection: 'Threads',
    singular: 'Thread',
    source: 'Threads saved in this workspace',
    createLabel: 'New thread',
    linked: {
      view: 'wizard',
      label: 'Open project sessions',
    },
    actions: [
      {
        label: 'Archive thread',
        status: 'Archived',
        from: ['Open', 'Draft'],
      },
      {
        label: 'Reopen thread',
        status: 'Open',
        from: ['Archived'],
      },
    ],
  },
  tasks: {
    title: 'Tasks',
    summary:
      'Track assignments, blockers and evidence from first action to completion.',
    collection: 'Work board',
    singular: 'Task',
    source: 'Tasks saved in this workspace',
    createLabel: 'Create task',
    noteLabel: 'Task update',
    linked: {
      view: 'agents',
      label: 'View agent roster',
    },
    actions: [
      {
        label: 'Start task',
        status: 'In progress',
        from: ['Ready', 'Draft', 'Blocked'],
      },
      {
        label: 'Mark blocked',
        status: 'Blocked',
        from: ['Ready', 'In progress'],
      },
      {
        label: 'Complete task',
        status: 'Complete',
        from: ['Ready', 'In progress'],
      },
      {
        label: 'Reopen task',
        status: 'Ready',
        from: ['Complete'],
      },
    ],
  },
  workflows: {
    title: 'Workflows',
    summary:
      'Inspect the steps, conditions and human handoffs in a repeatable process.',
    collection: 'Workflow library',
    singular: 'Workflow',
    source: 'Workflows saved in this workspace',
    createLabel: 'Draft workflow',
    linked: {
      view: 'tasks',
      label: 'Open task board',
    },
  },
  skills: {
    title: 'Skills',
    summary:
      'Review a working instruction, its owner and the roles that use it.',
    collection: 'Skill library',
    singular: 'Skill',
    source: 'Proposals saved in this workspace',
    createLabel: 'Propose skill',
    noteLabel: 'Revision note',
    linked: {
      view: 'agents',
      label: 'Open assigned roles',
    },
    actions: [
      {
        label: 'Accept proposal',
        status: 'Accepted',
        from: ['Draft', 'Proposed'],
      },
      {
        label: 'Request revision',
        status: 'Proposed',
        from: ['Accepted'],
      },
    ],
  },
  compute: {
    title: 'Compute',
    summary: 'Inspect machine assignments, capacity and remote access.',
    collection: 'Machine inventory',
    singular: 'Machine',
    source: 'Machine inventory maintained in this workspace',
    createLabel: 'Add machine',
    linked: {
      view: 'connections',
      label: 'Inspect connections',
    },
  },
  'optimal-engine': {
    title: 'Optimal Engine',
    summary: 'Capture source notes and review them for your index.',
    collection: 'Knowledge index',
    singular: 'Note',
    source: 'Notes saved in this workspace',
    createLabel: 'Capture note',
    noteLabel: 'Source annotation',
    linked: {
      view: 'brain-files',
      label: 'Browse files',
    },
    actions: [
      {
        label: 'Include in local index',
        status: 'Indexed',
        from: ['Draft', 'Needs review'],
      },
      {
        label: 'Flag for review',
        status: 'Needs review',
        from: ['Indexed'],
      },
    ],
  },
  'brain-files': {
    title: 'Brain Files',
    summary:
      'Browse company documents, inspect their metadata and follow related records.',
    collection: 'File directory',
    singular: 'File',
    source: 'Document references saved in this workspace',
    createLabel: 'Add document reference',
    linked: {
      view: 'optimal-engine',
      label: 'Open knowledge index',
    },
  },
  'knowledge-visualizer': {
    title: 'Knowledge Visualizer',
    summary:
      'Trace relationships between company decisions, documents and client work.',
    collection: 'Graph directory',
    singular: 'Node',
    source: 'Relationships recorded by hand',
    createLabel: 'Add relationship',
  },
  drift: {
    title: 'Drift',
    summary:
      'Compare conflicting claims and record which source needs correction.',
    collection: 'Claim reviews',
    singular: 'Conflict',
    source: 'Claim reviews saved in this workspace',
    createLabel: 'Add claim review',
    noteLabel: 'Proposed correction',
    linked: {
      view: 'optimal-engine',
      label: 'Open source notes',
    },
  },
  settings: {
    title: 'Settings',
    summary: 'Inspect workspace access and settings.',
    collection: 'Workspace settings',
    singular: 'Setting',
    source: 'Configuration notes for this installation',
    createLabel: 'Add setting note',
    linked: {
      view: 'connections',
      label: 'Inspect connection status',
    },
  },
  connections: {
    title: 'Connections',
    summary:
      'Inspect a service’s intended capabilities and current connection state.',
    collection: 'Integration registry',
    singular: 'Connection',
    source: 'Connections documented by hand',
    createLabel: 'Add connection note',
  },
  usage: {
    title: 'Usage',
    summary: 'Trace consumption to a run, machine and reporting period.',
    collection: 'Usage reports',
    singular: 'Usage record',
    source: 'Usage reports entered by hand',
    createLabel: 'Add usage report',
    linked: {
      view: 'compute',
      label: 'Inspect fleet',
    },
  },
  blueprint: {
    title: 'Blueprint',
    summary:
      'Inspect system dependencies and the records each service would own.',
    collection: 'System components',
    singular: 'Component',
    source: 'System components documented by hand',
    createLabel: 'Add component',
  },
  roadmap: {
    title: 'Roadmap',
    summary:
      'Follow a release milestone to its owner, dependencies and acceptance evidence.',
    collection: 'Release milestones',
    singular: 'Milestone',
    source: 'Milestones saved in this workspace',
    createLabel: 'Add milestone',
    noteLabel: 'Milestone update',
    actions: [
      {
        label: 'Start milestone',
        status: 'In progress',
        from: ['Draft', 'Planned'],
      },
      {
        label: 'Request acceptance',
        status: 'In review',
        from: ['In progress'],
      },
      {
        label: 'Accept milestone',
        status: 'Complete',
        from: ['In review'],
      },
      {
        label: 'Reopen milestone',
        status: 'In progress',
        from: ['Complete'],
      },
    ],
  },
}
