import type { LucideIcon } from 'lucide-react'
import { Bot, Headphones, LineChart, Search, Terminal } from 'lucide-react'

export type Agent = {
  name: string
  description: string
  category: string
  rating: string
  deployments: string
  icon: LucideIcon
  accent: string
}

export const agents: Agent[] = [
  { name: 'Customer Support Agent', description: 'Resolve tickets, surface context, and keep every customer conversation moving.', category: 'Customer experience', rating: '4.9', deployments: '2.4k', icon: Headphones, accent: 'cyan' },
  { name: 'Sales Intelligence Agent', description: 'Turn account signals into focused briefs and next-best actions for your team.', category: 'Revenue operations', rating: '4.8', deployments: '1.8k', icon: LineChart, accent: 'orange' },
  { name: 'Research Assistant', description: 'Synthesize trusted sources into clear, decision-ready research in minutes.', category: 'Knowledge work', rating: '4.9', deployments: '3.1k', icon: Search, accent: 'violet' },
  { name: 'DevOps Automation Agent', description: 'Diagnose incidents and automate repeatable infrastructure workflows safely.', category: 'Engineering', rating: '4.7', deployments: '980', icon: Terminal, accent: 'lime' },
]
