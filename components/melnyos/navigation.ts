import {
  Aperture,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ChartCandlestick,
  CircleDollarSign,
  ContactRound,
  FileInput,
  FilePenLine,
  FlaskConical,
  FolderTree,
  Gauge,
  GitBranch,
  GitCompare,
  Handshake,
  Inbox,
  Layers3,
  LayoutDashboard,
  ListTodo,
  Mail,
  Map,
  MessageCircle,
  Network,
  Phone,
  Plug,
  Settings2,
  Sparkles,
  SquareTerminal,
  TrendingUp,
  UsersRound,
  Waypoints,
  type LucideIcon,
} from 'lucide-react'

export interface Destination {
  id: string
  name: string
  icon: LucideIcon
}
type Group = { name: string; items: Destination[] }
export const sections: Group[] = [
  {
    name: 'Growth & outreach',
    items: [
      { id: 'today', name: 'Today', icon: LayoutDashboard },
      { id: 'calls', name: 'Cold calls', icon: Phone },
      { id: 'email', name: 'Cold email', icon: Mail },
      { id: 'leads', name: 'Businesses', icon: ContactRound },
      { id: 'sales', name: 'Sales calls', icon: CalendarDays },
      { id: 'experiments', name: 'A/B experiments', icon: FlaskConical },
      { id: 'analytics', name: 'Analytics', icon: BarChart3 },
      {
        id: 'submissions',
        name: 'Form submissions',
        icon: FileInput,
      },
    ],
  },
  {
    name: 'Command',
    items: [
      { id: 'wizard', name: 'Wizard', icon: Sparkles },
      { id: 'comms', name: 'Comms', icon: Inbox },
    ],
  },
  {
    name: 'Revenue',
    items: [
      {
        id: 'revenue',
        name: 'Revenue overview',
        icon: TrendingUp,
      },
      { id: 'funnel', name: 'Funnel', icon: TrendingUp },
      { id: 'brand-deals', name: 'Brand Deals', icon: Handshake },
      { id: 'clients', name: 'Clients', icon: BriefcaseBusiness },
      {
        id: 'finances',
        name: 'Finances',
        icon: CircleDollarSign,
      },
      { id: 'trading', name: 'Trading', icon: ChartCandlestick },
    ],
  },
  {
    name: 'Workforce',
    items: [
      { id: 'agents', name: 'Agents', icon: UsersRound },
      { id: 'chats', name: 'Chats', icon: MessageCircle },
      { id: 'tasks', name: 'Tasks', icon: ListTodo },
      { id: 'workflows', name: 'Workflows', icon: GitBranch },
      { id: 'skills', name: 'Skills', icon: Layers3 },
      { id: 'compute', name: 'Compute', icon: SquareTerminal },
    ],
  },
  {
    name: 'Knowledge',
    items: [
      { id: 'optimal-engine', name: 'Optimal Engine', icon: Aperture },
      { id: 'brain-files', name: 'Brain Files', icon: FolderTree },
      {
        id: 'knowledge-visualizer',
        name: 'Knowledge Visualizer',
        icon: Waypoints,
      },
      { id: 'drift', name: 'Drift', icon: GitCompare },
    ],
  },
  {
    name: 'System',
    items: [
      { id: 'settings', name: 'Settings', icon: Settings2 },
      { id: 'connections', name: 'Connections', icon: Plug },
      { id: 'usage', name: 'Usage', icon: Gauge },
      { id: 'blueprint', name: 'Blueprint', icon: Network },
      { id: 'roadmap', name: 'Roadmap', icon: Map },
    ],
  },
  {
    name: 'Publishing',
    items: [
      { id: 'blog', name: 'Blog drafts', icon: FilePenLine },
      { id: 'events', name: 'Events', icon: CalendarDays },
    ],
  },
]
