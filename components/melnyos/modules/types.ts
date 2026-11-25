export interface ModuleLink {
  view: string
  label: string
}
export interface ModuleRecord {
  id: string
  title: string
  category: string
  status: string
  description: string
  facts?: [string, string][]
  related?: ModuleLink[]
  excerpt?: string
  notes?: string[]
}
export interface ModuleDefinition {
  title: string
  summary: string
  collection: string
  singular: string
  source: string
  createLabel?: string
  noteLabel?: string
  linked?: ModuleLink
  actions?: { label: string; status: string; from: string[] }[]
}
